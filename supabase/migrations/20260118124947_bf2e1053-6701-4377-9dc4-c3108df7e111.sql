-- Drop the old permissive policy on admin_settings that still exists
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;

-- Drop the old permissive policies on job_category_stats
DROP POLICY IF EXISTS "Anyone can view category stats" ON public.job_category_stats;
DROP POLICY IF EXISTS "Authenticated users can insert category stats" ON public.job_category_stats;
DROP POLICY IF EXISTS "Authenticated users can update category stats" ON public.job_category_stats;

-- Drop the old policy on employer_plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.employer_plans;

-- Fix job_views permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can record job views" ON public.job_views;
CREATE POLICY "Authenticated users can record job views"
  ON public.job_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);