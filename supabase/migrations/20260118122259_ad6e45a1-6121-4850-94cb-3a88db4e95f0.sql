-- Create job_drafts table for saving draft job postings
CREATE TABLE public.job_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_drafts ENABLE ROW LEVEL SECURITY;

-- Employers can view their own drafts
CREATE POLICY "Employers can view their own drafts"
ON public.job_drafts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = job_drafts.employer_id AND p.user_id = auth.uid()
  )
);

-- Employers can create their own drafts
CREATE POLICY "Employers can create their own drafts"
ON public.job_drafts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = job_drafts.employer_id AND p.user_id = auth.uid()
  )
);

-- Employers can update their own drafts
CREATE POLICY "Employers can update their own drafts"
ON public.job_drafts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = job_drafts.employer_id AND p.user_id = auth.uid()
  )
);

-- Employers can delete their own drafts
CREATE POLICY "Employers can delete their own drafts"
ON public.job_drafts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = job_drafts.employer_id AND p.user_id = auth.uid()
  )
);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_job_drafts_updated_at
BEFORE UPDATE ON public.job_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_job_drafts_employer_id ON public.job_drafts(employer_id);