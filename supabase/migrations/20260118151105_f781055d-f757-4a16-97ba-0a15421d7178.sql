-- Allow public (unauthenticated) users to view basic employer info
CREATE POLICY "Public can view verified employers"
ON public.employers
FOR SELECT
TO anon
USING (verification_status = 'approved');

-- Allow public to view basic profile info for employers (for avatar)
CREATE POLICY "Public can view employer profile basics"
ON public.profiles
FOR SELECT
TO anon
USING (
  user_type = 'employer' AND 
  EXISTS (
    SELECT 1 FROM employers e 
    WHERE e.profile_id = profiles.id 
    AND e.verification_status = 'approved'
  )
);

-- Allow public to view open jobs (for job count on company page)
CREATE POLICY "Public can view open jobs"
ON public.jobs
FOR SELECT
TO anon
USING (status = 'open' AND is_active = true);