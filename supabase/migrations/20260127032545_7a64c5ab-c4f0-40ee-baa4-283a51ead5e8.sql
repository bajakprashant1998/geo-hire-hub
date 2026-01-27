-- Add extended fields for candidates
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available',
ADD COLUMN IF NOT EXISTS preferred_job_types text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS preferred_locations text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS headline text;

-- Add extended fields for employers
ALTER TABLE public.employers 
ADD COLUMN IF NOT EXISTS team_size text,
ADD COLUMN IF NOT EXISTS founding_year integer,
ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS culture_description text,
ADD COLUMN IF NOT EXISTS hiring_process text,
ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}'::text[];