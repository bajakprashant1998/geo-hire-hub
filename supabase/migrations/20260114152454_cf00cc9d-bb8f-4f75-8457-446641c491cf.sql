-- Fix #1: Profiles table - require authentication for viewing
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Add policy: Authenticated users can view visible profiles
CREATE POLICY "Authenticated users can view visible profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_visible_on_map = true
  );

-- Keep existing policy: Users can view their own profile (already exists)
-- This allows users to see their own profile even if is_visible_on_map is false

-- Fix #2: Employers table - require authentication for viewing
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Employers are viewable by everyone" ON public.employers;

-- Add policy: Authenticated users can view employers
CREATE POLICY "Authenticated users can view employers" ON public.employers
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Add policy: Users can view their own employer profile
CREATE POLICY "Users can view their own employer profile" ON public.employers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = employers.profile_id AND p.user_id = auth.uid()
    )
  );