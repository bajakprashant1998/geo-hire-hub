-- Fix infinite recursion in profiles RLS policies by removing cross-table subqueries
-- and replacing them with SECURITY DEFINER helpers.

-- Helper: get current user's type without invoking RLS
CREATE OR REPLACE FUNCTION public.get_current_user_type(_user_id uuid)
RETURNS public.user_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_type
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1
$$;

-- Helper: check if a profile belongs to an approved employer without invoking RLS
CREATE OR REPLACE FUNCTION public.is_approved_employer_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employers e
    WHERE e.profile_id = _profile_id
      AND e.verification_status = 'approved'
  )
$$;

-- Drop the problematic policies (they can cause recursion via profiles<->employers/candidates)
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view employer profile basics" ON public.profiles;

-- Recreate policies using SECURITY DEFINER functions (no cross-table subqueries)
CREATE POLICY "Candidates can view employer profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'employer'::public.user_type
  AND public.get_current_user_type(auth.uid()) = 'candidate'::public.user_type
);

CREATE POLICY "Employers can view visible candidate profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'candidate'::public.user_type
  AND is_visible_on_map = true
  AND public.get_current_user_type(auth.uid()) = 'employer'::public.user_type
);

CREATE POLICY "Public can view employer profile basics"
ON public.profiles
FOR SELECT
USING (
  user_type = 'employer'::public.user_type
  AND public.is_approved_employer_profile(id)
);
