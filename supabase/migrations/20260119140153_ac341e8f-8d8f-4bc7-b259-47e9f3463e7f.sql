-- Drop the problematic policies
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;

-- Create SECURITY DEFINER functions that bypass RLS to check user type
-- These functions query without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.get_current_user_employer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM employers e
  JOIN profiles p ON e.profile_id = p.id
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_candidate_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM candidates c
  JOIN profiles p ON c.profile_id = p.id
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- Recreate policies using SECURITY DEFINER functions (no recursion!)
CREATE POLICY "Employers can view visible candidate profiles" ON public.profiles
FOR SELECT USING (
  is_visible_on_map = true 
  AND user_type = 'candidate'::user_type 
  AND public.get_current_user_employer_id() IS NOT NULL
);

CREATE POLICY "Candidates can view employer profiles" ON public.profiles
FOR SELECT USING (
  user_type = 'employer'::user_type 
  AND public.get_current_user_candidate_id() IS NOT NULL
);