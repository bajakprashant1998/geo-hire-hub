
-- =============================================
-- SEO-FRIENDLY SLUGS & LOCATION HIERARCHY
-- =============================================

-- Helper function to generate URL-safe slugs
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          trim(input_text),
          '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Collapse multiple hyphens
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- =============================================
-- JOBS: Add slug and structured location
-- =============================================
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON public.jobs(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location_country, location_state, location_city);

-- Auto-generate job slugs
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := public.generate_slug(NEW.title);
  final_slug := base_slug;
  
  -- Ensure uniqueness by appending a counter
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE slug = final_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_jobs_slug
  BEFORE INSERT OR UPDATE OF title ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_slug();

-- =============================================
-- EMPLOYERS: Add slug
-- =============================================
ALTER TABLE public.employers 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employers_slug ON public.employers(slug) WHERE slug IS NOT NULL;

-- Auto-generate employer slugs
CREATE OR REPLACE FUNCTION public.generate_employer_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := public.generate_slug(NEW.company_name);
  final_slug := base_slug;
  
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.employers WHERE slug = final_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_employers_slug
  BEFORE INSERT OR UPDATE OF company_name ON public.employers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_employer_slug();

-- =============================================
-- PROFILES: Add location hierarchy
-- =============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

-- Auto-generate profile slugs
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := public.generate_slug(NEW.full_name);
  final_slug := base_slug;
  
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug AND id != NEW.id) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_slug
  BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_slug();

-- =============================================
-- BACKFILL: Generate slugs for existing records
-- =============================================

-- Backfill job slugs
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, title FROM public.jobs WHERE slug IS NULL LOOP
    base_slug := public.generate_slug(rec.title);
    final_slug := base_slug;
    counter := 0;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE slug = final_slug AND id != rec.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.jobs SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill employer slugs
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, company_name FROM public.employers WHERE slug IS NULL LOOP
    base_slug := public.generate_slug(rec.company_name);
    final_slug := base_slug;
    counter := 0;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.employers WHERE slug = final_slug AND id != rec.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.employers SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill profile slugs
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, full_name FROM public.profiles WHERE slug IS NULL LOOP
    base_slug := public.generate_slug(rec.full_name);
    final_slug := base_slug;
    counter := 0;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug AND id != rec.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.profiles SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END $$;
