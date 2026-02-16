-- Allow anonymous users to view employer profiles (needed for job detail pages)
CREATE POLICY "Anon can view employer profiles"
ON public.profiles
FOR SELECT
TO anon
USING (user_type = 'employer'::user_type);