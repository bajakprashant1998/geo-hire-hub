
-- Skill endorsements table
CREATE TABLE public.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  endorser_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, endorser_profile_id, skill_name)
);

-- Index for fast lookups
CREATE INDEX idx_skill_endorsements_candidate ON public.skill_endorsements(candidate_id);
CREATE INDEX idx_skill_endorsements_skill ON public.skill_endorsements(candidate_id, skill_name);

-- Enable RLS
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- Anyone can view endorsements (public profile data)
CREATE POLICY "Anyone can view endorsements"
  ON public.skill_endorsements FOR SELECT
  USING (true);

-- Authenticated users can endorse (not themselves)
CREATE POLICY "Authenticated users can endorse"
  ON public.skill_endorsements FOR INSERT
  TO authenticated
  WITH CHECK (
    endorser_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND candidate_id NOT IN (
      SELECT c.id FROM candidates c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid()
    )
  );

-- Users can remove their own endorsements
CREATE POLICY "Users can remove own endorsements"
  ON public.skill_endorsements FOR DELETE
  TO authenticated
  USING (endorser_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
