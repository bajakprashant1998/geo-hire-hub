CREATE OR REPLACE FUNCTION public.get_nearby_jobs(user_lat double precision, user_lng double precision, radius_km double precision DEFAULT 50)
 RETURNS TABLE(id uuid, employer_id uuid, title text, description text, salary_range text, job_type text, latitude double precision, longitude double precision, status job_status, created_at timestamp with time zone, distance_km double precision, company_name text, job_category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    j.id,
    j.employer_id,
    j.title,
    j.description,
    j.salary_range,
    j.job_type,
    j.latitude,
    j.longitude,
    j.status,
    j.created_at,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(j.latitude))
    )) AS distance_km,
    e.company_name,
    COALESCE(j.job_category, 'private') AS job_category
  FROM public.jobs j
  JOIN public.employers e ON j.employer_id = e.id
  WHERE j.status = 'open'
    AND j.is_active = true
    AND (j.expires_at IS NULL OR j.expires_at > now())
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(j.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$function$