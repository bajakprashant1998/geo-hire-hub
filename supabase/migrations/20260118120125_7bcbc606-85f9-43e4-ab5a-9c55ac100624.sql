-- Create saved_candidates table for employers to bookmark candidates
CREATE TABLE public.saved_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employer_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;

-- Employers can save candidates
CREATE POLICY "Employers can save candidates"
ON public.saved_candidates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = saved_candidates.employer_id
    AND p.user_id = auth.uid()
  )
);

-- Employers can view their saved candidates
CREATE POLICY "Employers can view their saved candidates"
ON public.saved_candidates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = saved_candidates.employer_id
    AND p.user_id = auth.uid()
  )
);

-- Employers can unsave candidates
CREATE POLICY "Employers can unsave candidates"
ON public.saved_candidates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE e.id = saved_candidates.employer_id
    AND p.user_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_saved_candidates_employer ON public.saved_candidates(employer_id);
CREATE INDEX idx_saved_candidates_candidate ON public.saved_candidates(candidate_id);