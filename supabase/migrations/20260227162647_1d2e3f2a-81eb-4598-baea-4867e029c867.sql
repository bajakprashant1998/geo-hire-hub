
-- Tighten the INSERT policy - only allow inserts when no auth context (service role)
DROP POLICY "Service role can insert email logs" ON public.email_logs;
CREATE POLICY "Only service role can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (auth.uid() IS NULL);
