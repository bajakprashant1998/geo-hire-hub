
-- Add salary currency to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'INR';

-- Add timezone to profiles table for timezone-aware features
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL;
