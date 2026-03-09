
-- Add employer_id column to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employer_id uuid REFERENCES public.employers(id);

-- Backfill existing rows
UPDATE public.applications a
SET employer_id = j.employer_id
FROM public.jobs j
WHERE a.job_id = j.id AND a.employer_id IS NULL;

-- Create trigger function to auto-set employer_id on INSERT
CREATE OR REPLACE FUNCTION public.set_application_employer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT employer_id INTO NEW.employer_id
  FROM public.jobs WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_set_application_employer_id ON public.applications;
CREATE TRIGGER trg_set_application_employer_id
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_employer_id();
