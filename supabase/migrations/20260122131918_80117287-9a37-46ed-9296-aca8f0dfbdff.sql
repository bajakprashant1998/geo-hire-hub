-- Fix infinite recursion in RLS policies by using direct auth.uid() checks instead of functions that query back to the same tables

-- Drop problematic policies on profiles
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view employer profile basics" ON public.profiles;

-- Drop policies on employers that might cause recursion  
DROP POLICY IF EXISTS "Authenticated users can view employers" ON public.employers;

-- Drop policies on candidates that query profiles
DROP POLICY IF EXISTS "Employers can view candidates" ON public.candidates;

-- Recreate profiles policies with direct user_id checks (no function calls that query related tables)
CREATE POLICY "Candidates can view employer profiles" ON public.profiles
  FOR SELECT
  USING (
    user_type = 'employer'::user_type 
    AND EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view visible candidate profiles" ON public.profiles
  FOR SELECT
  USING (
    is_visible_on_map = true 
    AND user_type = 'candidate'::user_type 
    AND EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view employer profile basics" ON public.profiles
  FOR SELECT
  USING (
    user_type = 'employer'::user_type 
    AND EXISTS (
      SELECT 1 FROM public.employers e
      WHERE e.profile_id = profiles.id 
      AND e.verification_status = 'approved'
    )
  );

-- Recreate employers policy without recursion
CREATE POLICY "Authenticated users can view employers" ON public.employers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Recreate candidates policy for employers viewing
CREATE POLICY "Employers can view candidates" ON public.candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );