-- Remove duplicate/loose INSERT policies on job_views
DROP POLICY IF EXISTS "Anyone can record job views" ON public.job_views;
DROP POLICY IF EXISTS "Employers can view their job views" ON public.job_views;

-- Tighten job_views INSERT: require viewer_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can record job views" ON public.job_views;
CREATE POLICY "Authenticated users can record job views" ON public.job_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Remove duplicate INSERT on profile_views and tighten
DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Authenticated users can record views" ON public.profile_views;
CREATE POLICY "Authenticated users can record profile views" ON public.profile_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());