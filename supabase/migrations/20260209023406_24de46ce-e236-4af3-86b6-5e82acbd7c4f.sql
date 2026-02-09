
-- Create interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id),
  employer_id UUID NOT NULL REFERENCES public.employers(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  interview_type TEXT NOT NULL DEFAULT 'video',
  meeting_link TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Employers can create interviews for their jobs
CREATE POLICY "Employers can create interviews"
ON public.interviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = interviews.employer_id AND p.user_id = auth.uid()
  )
);

-- Employers can view their interviews
CREATE POLICY "Employers can view their interviews"
ON public.interviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = interviews.employer_id AND p.user_id = auth.uid()
  )
);

-- Employers can update their interviews
CREATE POLICY "Employers can update their interviews"
ON public.interviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = interviews.employer_id AND p.user_id = auth.uid()
  )
);

-- Candidates can view their own interviews
CREATE POLICY "Candidates can view their interviews"
ON public.interviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidates c
    JOIN profiles p ON c.profile_id = p.id
    WHERE c.id = interviews.candidate_id AND p.user_id = auth.uid()
  )
);

-- Admins can view all interviews
CREATE POLICY "Admins can view all interviews"
ON public.interviews FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate meeting link on insert
CREATE OR REPLACE FUNCTION public.generate_meeting_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meeting_link IS NULL AND NEW.interview_type = 'video' THEN
    NEW.meeting_link := 'https://meet.jit.si/hireforjob-' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_meeting_link
BEFORE INSERT ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.generate_meeting_link();

-- Updated_at trigger
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
