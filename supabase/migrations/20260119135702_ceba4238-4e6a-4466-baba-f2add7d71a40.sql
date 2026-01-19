-- Drop the old recursive policies that still use is_employer() and is_candidate()
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;

-- Recreate without using the helper functions to prevent recursion
-- Use direct subqueries that don't trigger profile table policies

-- Employers can view visible candidate profiles (avoiding is_employer function)
CREATE POLICY "Employers can view visible candidate profiles" ON public.profiles
FOR SELECT USING (
  is_visible_on_map = true 
  AND user_type = 'candidate'::user_type 
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.profile_id IN (
      SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);

-- Candidates can view employer profiles (avoiding is_candidate function)
CREATE POLICY "Candidates can view employer profiles" ON public.profiles
FOR SELECT USING (
  user_type = 'employer'::user_type 
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.profile_id IN (
      SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);