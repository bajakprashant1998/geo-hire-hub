
-- Add translations jsonb column to jobs
-- Structure: { "es": { "title": "...", "description": "..." }, "fr": { ... } }
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT NULL;
