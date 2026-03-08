
-- Drop the overly permissive service_role policy since service_role bypasses RLS anyway
DROP POLICY "System can manage user badges" ON public.user_badges;
