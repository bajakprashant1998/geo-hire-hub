
-- Create applications table to track job applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  cover_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(participant_1, participant_2, job_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add profile_completed column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "Candidates can view their own applications" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates c 
            JOIN public.profiles p ON c.profile_id = p.id 
            WHERE c.id = applications.candidate_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Employers can view applications for their jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j 
            JOIN public.employers e ON j.employer_id = e.id
            JOIN public.profiles p ON e.profile_id = p.id
            WHERE j.id = applications.job_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Candidates can create applications" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.candidates c 
            JOIN public.profiles p ON c.profile_id = p.id 
            WHERE c.id = candidate_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Employers can update application status" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j 
            JOIN public.employers e ON j.employer_id = e.id
            JOIN public.profiles p ON e.profile_id = p.id
            WHERE j.id = applications.job_id AND p.user_id = auth.uid())
  );

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id 
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
  );

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create triggers for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster message queries
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
