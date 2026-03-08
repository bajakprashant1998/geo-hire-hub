-- Allow authenticated users to insert search appearances (from client-side tracking)
CREATE POLICY "Authenticated users can record search appearances"
  ON public.search_appearances FOR INSERT
  TO authenticated
  WITH CHECK (true);