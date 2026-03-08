-- Fix email_logs: ensure INSERT restricted to service_role only
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service_role management for job_matches writes
CREATE POLICY "Service role manages job matches"
  ON public.job_matches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read access for job_matches
CREATE POLICY "Admins can view all job matches"
  ON public.job_matches FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));