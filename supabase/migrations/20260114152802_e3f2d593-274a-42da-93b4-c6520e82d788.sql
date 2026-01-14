-- Fix get_nearby_candidates: Add authentication and employer role check
CREATE OR REPLACE FUNCTION public.get_nearby_candidates(user_lat double precision, user_lng double precision, radius_km double precision DEFAULT 50)
RETURNS TABLE(id uuid, profile_id uuid, full_name text, job_title text, experience_years integer, skills text[], latitude double precision, longitude double precision, avatar_url text, distance_km double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify caller is an employer
  IF NOT EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only employers can view candidates';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.profile_id,
    p.full_name,
    c.job_title,
    c.experience_years,
    c.skills,
    p.latitude,
    p.longitude,
    p.avatar_url,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) AS distance_km
  FROM public.candidates c
  JOIN public.profiles p ON c.profile_id = p.id
  WHERE p.is_visible_on_map = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$$;

-- Fix get_nearby_jobs: Add authentication check (candidates need to view jobs)
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(user_lat double precision, user_lng double precision, radius_km double precision DEFAULT 50)
RETURNS TABLE(id uuid, employer_id uuid, title text, description text, salary_range text, job_type text, latitude double precision, longitude double precision, status job_status, created_at timestamp with time zone, distance_km double precision, company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    e.company_name
  FROM public.jobs j
  JOIN public.employers e ON j.employer_id = e.id
  WHERE j.status = 'open'
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(j.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$$;