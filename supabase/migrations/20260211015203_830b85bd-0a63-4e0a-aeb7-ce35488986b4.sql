
-- Allow anonymous users to view candidate profiles visible on map
CREATE POLICY "Public can view visible candidate profiles on map"
ON public.profiles FOR SELECT
USING (
  is_visible_on_map = true
  AND user_type = 'candidate'
);

-- Allow anonymous users to view candidates whose profiles are visible on map
CREATE POLICY "Public can view map-visible candidates"
ON public.candidates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = candidates.profile_id
    AND p.is_visible_on_map = true
  )
);
