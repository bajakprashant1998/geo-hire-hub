
-- Fix profile_views INSERT policy: require authentication
DROP POLICY IF EXISTS "Anyone can record views" ON public.profile_views;
CREATE POLICY "Authenticated users can record views"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
