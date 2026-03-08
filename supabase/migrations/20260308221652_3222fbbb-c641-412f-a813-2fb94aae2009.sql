-- Allow employers to read job_views for their own jobs
CREATE POLICY "Employers can view job views for their jobs"
  ON public.job_views FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      JOIN public.employers e ON j.employer_id = e.id
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Allow anyone to insert job views (for tracking)
CREATE POLICY "Anyone can record job views"
  ON public.job_views FOR INSERT
  TO authenticated
  WITH CHECK (true);