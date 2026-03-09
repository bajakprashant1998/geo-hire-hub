-- Add structured filter columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_min numeric DEFAULT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_max numeric DEFAULT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS experience_level text DEFAULT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false;

-- Add index for common filter queries
CREATE INDEX IF NOT EXISTS idx_jobs_filters ON public.jobs (status, is_active, is_remote, experience_level);