-- Add unique constraint on job_categories name for duplicate prevention
ALTER TABLE public.job_categories ADD CONSTRAINT job_categories_name_unique UNIQUE (name);