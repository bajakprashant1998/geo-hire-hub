-- Fix: admin_settings - restrict to admins only
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;
CREATE POLICY "Only admins can read settings"
  ON public.admin_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix: employer_plans - require authentication for viewing plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.employer_plans;
CREATE POLICY "Authenticated users can view active plans"
  ON public.employer_plans FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Fix: job_category_stats - prevent direct manipulation
DROP POLICY IF EXISTS "Anyone can track category usage" ON public.job_category_stats;
DROP POLICY IF EXISTS "Authenticated users can update stats" ON public.job_category_stats;
CREATE POLICY "No direct inserts allowed"
  ON public.job_category_stats FOR INSERT
  WITH CHECK (false);
CREATE POLICY "No direct updates allowed"
  ON public.job_category_stats FOR UPDATE
  USING (false);
CREATE POLICY "Authenticated users can view stats"
  ON public.job_category_stats FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: employer-documents bucket - make private and restrict access
UPDATE storage.buckets SET public = false WHERE id = 'employer-documents';

DROP POLICY IF EXISTS "Anyone can view employer documents" ON storage.objects;
CREATE POLICY "Employers can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employer-documents' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Fix: track_category_usage function - add validation
CREATE OR REPLACE FUNCTION public.track_category_usage(p_category_name text, p_is_selection boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate category name
  IF p_category_name IS NULL OR LENGTH(TRIM(p_category_name)) < 2 THEN
    RAISE EXCEPTION 'Category name too short';
  END IF;
  
  IF LENGTH(TRIM(p_category_name)) > 100 THEN
    RAISE EXCEPTION 'Category name too long';
  END IF;
  
  -- Prevent special characters
  IF p_category_name !~ '^[a-zA-Z0-9\s\-/()''&.,]+$' THEN
    RAISE EXCEPTION 'Invalid characters in category name';
  END IF;
  
  INSERT INTO public.job_category_stats (category_name, search_count, selection_count, last_used_at)
  VALUES (
    LOWER(TRIM(p_category_name)),
    CASE WHEN p_is_selection THEN 0 ELSE 1 END,
    CASE WHEN p_is_selection THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (category_name)
  DO UPDATE SET
    search_count = job_category_stats.search_count + CASE WHEN p_is_selection THEN 0 ELSE 1 END,
    selection_count = job_category_stats.selection_count + CASE WHEN p_is_selection THEN 1 ELSE 0 END,
    last_used_at = now();
END;
$function$;