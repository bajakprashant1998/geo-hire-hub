-- Fix RLS policies to ensure users can always read their own profile
-- The issue: circular dependency in helper functions causing failures

-- Drop all SELECT policies on profiles to rebuild them cleanly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view employer profile basics" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles with application relationship" ON public.profiles;

-- 1. Users can ALWAYS view their own profile (highest priority, no function calls)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Users in a conversation can view each other's profiles
CREATE POLICY "Conversation participants can view profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.participant_1 = auth.uid() AND c.participant_2 = profiles.user_id)
       OR (c.participant_2 = auth.uid() AND c.participant_1 = profiles.user_id)
  )
);

-- 4. Application relationship allows profile viewing
CREATE POLICY "Application relationship allows profile view"
ON public.profiles
FOR SELECT
USING (public.has_application_relationship(auth.uid(), id));

-- 5. Candidates can view employer profiles (employer profiles are semi-public to job seekers)
CREATE POLICY "Authenticated can view employer profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'employer'
  AND auth.uid() IS NOT NULL
);

-- 6. Employers can view visible candidate profiles
CREATE POLICY "Employers can view visible candidates"
ON public.profiles
FOR SELECT
USING (
  user_type = 'candidate'
  AND is_visible_on_map = true
  AND public.is_employer(auth.uid())
);