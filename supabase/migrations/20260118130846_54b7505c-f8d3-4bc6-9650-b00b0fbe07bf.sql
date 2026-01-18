-- Drop the still-recursive policies
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles for applied jobs" ON public.profiles;

-- Create helper function to check if user has application relationship with a profile
CREATE OR REPLACE FUNCTION public.has_application_relationship(_viewer_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Employer viewing candidate who applied to their jobs
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    JOIN profiles ep ON e.profile_id = ep.id
    JOIN candidates c ON a.candidate_id = c.id
    WHERE ep.user_id = _viewer_user_id AND c.profile_id = _profile_id
  ) OR EXISTS (
    -- Candidate viewing employer they applied to
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    JOIN candidates c ON a.candidate_id = c.id
    JOIN profiles cp ON c.profile_id = cp.id
    WHERE cp.user_id = _viewer_user_id AND e.profile_id = _profile_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view profiles with application relationship"
  ON public.profiles FOR SELECT
  USING (public.has_application_relationship(auth.uid(), id));