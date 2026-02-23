-- Add unique constraint on job_categories.name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS job_categories_name_unique_lower ON public.job_categories (lower(name));