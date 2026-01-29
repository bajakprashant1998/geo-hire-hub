-- Create table to store AI-generated match scores between candidates and jobs
CREATE TABLE public.job_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons JSONB DEFAULT '[]'::jsonb,
  skill_overlap TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  location_match BOOLEAN DEFAULT false,
  experience_match BOOLEAN DEFAULT false,
  salary_match BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- Enable RLS
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own matches
CREATE POLICY "Candidates can view their own matches"
ON public.job_matches
FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM public.candidates 
    WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Employers can view matches for their jobs
CREATE POLICY "Employers can view matches for their jobs"
ON public.job_matches
FOR SELECT
USING (
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE employer_id IN (
      SELECT id FROM public.employers 
      WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- System can insert/update matches (via service role in edge functions)
CREATE POLICY "Service role can manage matches"
ON public.job_matches
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_job_matches_candidate ON public.job_matches(candidate_id);
CREATE INDEX idx_job_matches_job ON public.job_matches(job_id);
CREATE INDEX idx_job_matches_score ON public.job_matches(match_score DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_job_matches_updated_at
BEFORE UPDATE ON public.job_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();