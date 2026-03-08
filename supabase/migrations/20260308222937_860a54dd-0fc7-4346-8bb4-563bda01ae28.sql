
-- Add response rate columns to employers
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS response_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_response_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_rate_updated_at timestamptz DEFAULT NULL;

-- Function to calculate and cache employer response rate
CREATE OR REPLACE FUNCTION public.calculate_employer_response_rate(p_employer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_apps integer;
  responded_apps integer;
  rate numeric;
  avg_hours numeric;
BEGIN
  -- Count total applications to this employer's jobs (older than 48h to give time to respond)
  SELECT COUNT(*) INTO total_apps
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE j.employer_id = p_employer_id
    AND a.created_at < now() - interval '48 hours';

  -- Count applications that got a status change (not 'pending')
  SELECT COUNT(*) INTO responded_apps
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE j.employer_id = p_employer_id
    AND a.created_at < now() - interval '48 hours'
    AND a.status IS DISTINCT FROM 'pending';

  -- Calculate average response time in hours for responded applications
  SELECT AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 3600)
  INTO avg_hours
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE j.employer_id = p_employer_id
    AND a.status IS DISTINCT FROM 'pending'
    AND a.updated_at > a.created_at;

  IF total_apps > 0 THEN
    rate := ROUND((responded_apps::numeric / total_apps::numeric) * 100, 1);
  ELSE
    rate := NULL;
  END IF;

  -- Cache the result
  UPDATE employers
  SET response_rate = rate,
      avg_response_hours = ROUND(COALESCE(avg_hours, 0), 1),
      response_rate_updated_at = now()
  WHERE id = p_employer_id;

  RETURN jsonb_build_object(
    'response_rate', rate,
    'avg_response_hours', ROUND(COALESCE(avg_hours, 0), 1),
    'total_applications', total_apps,
    'responded', responded_apps
  );
END;
$$;
