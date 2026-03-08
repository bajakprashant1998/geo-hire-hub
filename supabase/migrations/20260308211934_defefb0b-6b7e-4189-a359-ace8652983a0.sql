-- Drop dependent index first
DROP INDEX IF EXISTS public.idx_world_cities_search;

-- Move pg_trgm from public to extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the index using extensions schema operator class
CREATE INDEX idx_world_cities_search ON public.world_cities USING gin (search_text extensions.gin_trgm_ops);