-- Create a security definer function to check if user is an employer (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_employer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employers e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.user_id = _user_id
  )
$$;

-- Create a security definer function to check if user is a candidate (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_candidate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM candidates c
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = _user_id
  )
$$;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles for applied jobs" ON public.profiles;

-- Recreate policies using the security definer functions
CREATE POLICY "Employers can view visible candidate profiles"
  ON public.profiles FOR SELECT
  USING (
    is_visible_on_map = true
    AND user_type = 'candidate'
    AND public.is_employer(auth.uid())
  );

CREATE POLICY "Candidates can view employer profiles"
  ON public.profiles FOR SELECT
  USING (
    user_type = 'employer'
    AND public.is_candidate(auth.uid())
  );

CREATE POLICY "Users can view profiles of conversation participants"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE (c.participant_1 = auth.uid() AND c.participant_2 = profiles.user_id)
         OR (c.participant_2 = auth.uid() AND c.participant_1 = profiles.user_id)
    )
  );

CREATE POLICY "Employers can view applicant profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN candidates c ON a.candidate_id = c.id
      WHERE e.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND c.profile_id = profiles.id
    )
  );

CREATE POLICY "Candidates can view employer profiles for applied jobs"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN candidates c ON a.candidate_id = c.id
      WHERE c.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND e.profile_id = profiles.id
    )
  );