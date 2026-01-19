-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Employers can view visible candidate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Candidates can view employer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view candidates" ON public.candidates;

-- Recreate profile policies WITHOUT using is_employer() or is_candidate() functions
-- to avoid infinite recursion

-- Employers can view visible candidate profiles (direct join, no function call)
CREATE POLICY "Employers can view visible candidate profiles" ON public.profiles
FOR SELECT USING (
  is_visible_on_map = true 
  AND user_type = 'candidate'::user_type 
  AND EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Candidates can view employer profiles (direct join, no function call)
CREATE POLICY "Candidates can view employer profiles" ON public.profiles
FOR SELECT USING (
  user_type = 'employer'::user_type 
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Employers can view all candidates (direct join, no function call)
CREATE POLICY "Employers can view candidates" ON public.candidates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Also add a policy for users to view their own profile (if missing)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);