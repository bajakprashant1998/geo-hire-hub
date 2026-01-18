-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view visible profiles" ON public.profiles;

-- Employers can view candidate profiles that are visible on map (for discovery)
CREATE POLICY "Employers can view visible candidate profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_visible_on_map = true
    AND user_type = 'candidate'
    AND EXISTS (
      SELECT 1 FROM employers e
      JOIN profiles p ON e.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Candidates can view employer profiles (to research companies)
CREATE POLICY "Candidates can view employer profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_type = 'employer'
    AND EXISTS (
      SELECT 1 FROM candidates c
      JOIN profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Users can view profiles they have conversations with
CREATE POLICY "Users can view profiles of conversation participants"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE (c.participant_1 = auth.uid() AND c.participant_2 = profiles.user_id)
         OR (c.participant_2 = auth.uid() AND c.participant_1 = profiles.user_id)
    )
  );

-- Employers can view profiles of candidates who applied to their jobs
CREATE POLICY "Employers can view applicant profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN profiles ep ON e.profile_id = ep.id
      JOIN candidates c ON a.candidate_id = c.id
      WHERE ep.user_id = auth.uid() AND c.profile_id = profiles.id
    )
  );

-- Candidates can view profiles of employers they applied to
CREATE POLICY "Candidates can view employer profiles for applied jobs"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN profiles cp ON c.profile_id = cp.id
      WHERE cp.user_id = auth.uid() AND e.profile_id = profiles.id
    )
  );