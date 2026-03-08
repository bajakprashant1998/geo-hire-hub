
-- Validation trigger: block applications on expired jobs
CREATE OR REPLACE FUNCTION public.validate_application_deadline()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  job_deadline timestamptz;
  job_active boolean;
  job_status text;
BEGIN
  SELECT expires_at, is_active, status INTO job_deadline, job_active, job_status
  FROM public.jobs WHERE id = NEW.job_id;

  IF job_status != 'open' OR job_active = false THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;

  IF job_deadline IS NOT NULL AND job_deadline < now() THEN
    RAISE EXCEPTION 'The application deadline for this job has passed';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_application_deadline_trigger
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_application_deadline();
