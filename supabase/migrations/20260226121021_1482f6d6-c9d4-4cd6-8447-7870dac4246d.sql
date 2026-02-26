-- Allow users to view their own job views
CREATE POLICY "Users can view their own job views"
ON public.job_views
FOR SELECT
USING (viewer_id = auth.uid());