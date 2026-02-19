
CREATE OR REPLACE FUNCTION public.can_employer_activate_job(p_employer_id uuid, p_exclude_job_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_count INTEGER;
  max_allowed INTEGER;
  plan_name TEXT;
  sub RECORD;
  free_plan RECORD;
BEGIN
  -- Get employer's subscription and plan
  SELECT es.*, ep.max_active_jobs, ep.name INTO sub
  FROM public.employer_subscriptions es
  JOIN public.employer_plans ep ON es.plan_id = ep.id
  WHERE es.employer_id = p_employer_id AND es.status = 'active';
  
  -- If no subscription, look up the Free plan dynamically
  IF sub IS NULL THEN
    SELECT ep.max_active_jobs, ep.name INTO free_plan
    FROM public.employer_plans ep
    WHERE ep.name = 'Free' AND ep.is_active = true
    LIMIT 1;
    
    IF free_plan IS NOT NULL THEN
      max_allowed := free_plan.max_active_jobs;
      plan_name := free_plan.name;
    ELSE
      -- No free plan exists, disallow
      max_allowed := 0;
      plan_name := 'None';
    END IF;
  ELSE
    max_allowed := sub.max_active_jobs;
    plan_name := sub.name;
  END IF;
  
  -- Count current active jobs (excluding the one being toggled)
  SELECT COUNT(*) INTO active_count
  FROM public.jobs
  WHERE employer_id = p_employer_id 
    AND is_active = true 
    AND status = 'open'
    AND (p_exclude_job_id IS NULL OR id != p_exclude_job_id);
  
  RETURN jsonb_build_object(
    'can_activate', active_count < max_allowed,
    'active_count', active_count,
    'max_allowed', max_allowed,
    'plan_name', plan_name
  );
END;
$function$;
