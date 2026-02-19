
-- Create a trigger function that prevents unverified employers from inserting jobs
CREATE OR REPLACE FUNCTION public.check_employer_verified_before_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_status TEXT;
BEGIN
  SELECT verification_status INTO emp_status
  FROM public.employers
  WHERE id = NEW.employer_id;

  IF emp_status IS NULL THEN
    RAISE EXCEPTION 'Employer not found';
  END IF;

  IF emp_status != 'approved' THEN
    RAISE EXCEPTION 'Your company must be approved by an admin before you can post jobs. Current status: %', emp_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on jobs table
CREATE TRIGGER enforce_employer_approval_before_job
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.check_employer_verified_before_job();
