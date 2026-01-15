-- Drop the existing permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Open jobs are viewable by everyone" ON public.jobs;

-- Create new policy requiring authentication to view open jobs
CREATE POLICY "Authenticated users can view open jobs" 
ON public.jobs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND status = 'open');

-- Employers can also view their own jobs regardless of status
CREATE POLICY "Employers can view their own jobs" 
ON public.jobs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.employers e
  JOIN public.profiles p ON e.profile_id = p.id
  WHERE e.id = jobs.employer_id AND p.user_id = auth.uid()
));