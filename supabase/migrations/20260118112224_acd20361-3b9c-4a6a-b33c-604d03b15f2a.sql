
-- Add resume fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS resume_visibility text DEFAULT 'approved_employers',
ADD COLUMN IF NOT EXISTS resume_filename text,
ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamp with time zone;

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- Enable RLS for saved_jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_jobs
CREATE POLICY "Candidates can view their saved jobs" ON public.saved_jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM candidates c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE c.id = saved_jobs.candidate_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can save jobs" ON public.saved_jobs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM candidates c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE c.id = saved_jobs.candidate_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can unsave jobs" ON public.saved_jobs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM candidates c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE c.id = saved_jobs.candidate_id AND p.user_id = auth.uid()
  )
);

-- Create job_alerts table
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  skills text[] DEFAULT '{}',
  location text,
  category text,
  is_email_enabled boolean DEFAULT true,
  is_push_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for job_alerts
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_alerts
CREATE POLICY "Candidates can manage their job alerts" ON public.job_alerts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM candidates c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE c.id = job_alerts.candidate_id AND p.user_id = auth.uid()
  )
);

-- Create candidate_resumes table for AI-generated resumes
CREATE TABLE IF NOT EXISTS public.candidate_resumes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Resume',
  style text NOT NULL DEFAULT 'professional',
  content jsonb NOT NULL DEFAULT '{}',
  resume_score integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for candidate_resumes
ALTER TABLE public.candidate_resumes ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_resumes
CREATE POLICY "Candidates can manage their resumes" ON public.candidate_resumes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM candidates c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE c.id = candidate_resumes.candidate_id AND p.user_id = auth.uid()
  )
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

-- Add last_login_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;

-- Add education field to candidates
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]';

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes bucket
CREATE POLICY "Candidates can upload their resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Candidates can update their resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Candidates can delete their resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Approved employers can view resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM employers e 
      JOIN profiles p ON e.profile_id = p.id 
      WHERE p.user_id = auth.uid() AND e.verification_status = 'approved'
    )
  )
);
