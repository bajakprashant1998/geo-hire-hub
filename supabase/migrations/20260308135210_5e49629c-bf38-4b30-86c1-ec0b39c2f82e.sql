
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.world_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text,
  country text NOT NULL,
  population integer DEFAULT 0,
  search_text text GENERATED ALWAYS AS (lower(city || ' ' || coalesce(state, '') || ' ' || country)) STORED
);

CREATE INDEX idx_world_cities_search ON public.world_cities USING gin (search_text gin_trgm_ops);
CREATE INDEX idx_world_cities_city ON public.world_cities (lower(city));
CREATE INDEX idx_world_cities_country ON public.world_cities (lower(country));

ALTER TABLE public.world_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read world cities" ON public.world_cities FOR SELECT USING (true);
