-- Allow admins to view all auto-apply preferences
CREATE POLICY "Admins can view all auto-apply preferences"
ON public.auto_apply_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all auto-apply logs
CREATE POLICY "Admins can view all auto-apply logs"
ON public.auto_apply_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));