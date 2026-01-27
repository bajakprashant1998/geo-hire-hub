-- Phase 1: Government Job System

-- 1. Create government_domains table for verified government email domains
CREATE TABLE public.government_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  country TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.government_domains ENABLE ROW LEVEL SECURITY;

-- Anyone can read active domains
CREATE POLICY "Anyone can view active government domains"
  ON public.government_domains FOR SELECT
  USING (is_active = true);

-- Only admins can manage domains
CREATE POLICY "Admins can manage government domains"
  ON public.government_domains FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add government-related columns to employers table
ALTER TABLE public.employers 
  ADD COLUMN IF NOT EXISTS is_government BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS government_domain_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS government_email_domain TEXT;

-- 3. Add job_category column to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS job_category TEXT DEFAULT 'private';

-- Add constraint for job_category values
ALTER TABLE public.jobs 
  ADD CONSTRAINT jobs_job_category_check 
  CHECK (job_category IN ('private', 'government'));

-- 4. Insert common government domains
INSERT INTO public.government_domains (domain, country, description) VALUES
  ('gov.in', 'India', 'Indian Government'),
  ('nic.in', 'India', 'National Informatics Centre'),
  ('gov.uk', 'United Kingdom', 'UK Government'),
  ('gov.au', 'Australia', 'Australian Government'),
  ('gov', 'International', 'Generic Government TLD'),
  ('state.gov', 'USA', 'US State Department'),
  ('fed.us', 'USA', 'US Federal Government'),
  ('mil', 'USA', 'US Military'),
  ('gov.sg', 'Singapore', 'Singapore Government'),
  ('gov.ca', 'Canada', 'Canadian Government'),
  ('gouv.fr', 'France', 'French Government'),
  ('gov.br', 'Brazil', 'Brazilian Government'),
  ('gov.za', 'South Africa', 'South African Government'),
  ('gov.ae', 'UAE', 'UAE Government'),
  ('gov.my', 'Malaysia', 'Malaysian Government'),
  ('gov.ph', 'Philippines', 'Philippines Government'),
  ('gov.ng', 'Nigeria', 'Nigerian Government'),
  ('gov.bd', 'Bangladesh', 'Bangladesh Government'),
  ('gov.pk', 'Pakistan', 'Pakistan Government'),
  ('gov.eg', 'Egypt', 'Egyptian Government')
ON CONFLICT (domain) DO NOTHING;

-- 5. Create function to check if email domain is government
CREATE OR REPLACE FUNCTION public.is_government_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
  is_gov BOOLEAN;
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(email, '@', 2));
  
  -- Check if domain or any parent domain matches
  SELECT EXISTS (
    SELECT 1 FROM government_domains gd
    WHERE gd.is_active = true
    AND (
      email_domain = gd.domain
      OR email_domain LIKE '%.' || gd.domain
    )
  ) INTO is_gov;
  
  RETURN is_gov;
END;
$$;

-- 6. Create function to verify employer as government during signup
CREATE OR REPLACE FUNCTION public.verify_government_employer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  email_domain TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = (SELECT user_id FROM profiles WHERE id = NEW.profile_id);
  
  IF user_email IS NOT NULL THEN
    email_domain := lower(split_part(user_email, '@', 2));
    
    -- Check if government email
    IF is_government_email(user_email) THEN
      NEW.is_government := true;
      NEW.government_domain_verified := true;
      NEW.government_email_domain := email_domain;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create trigger for auto-verification on employer insert
DROP TRIGGER IF EXISTS verify_government_employer_trigger ON employers;
CREATE TRIGGER verify_government_employer_trigger
  BEFORE INSERT ON employers
  FOR EACH ROW
  EXECUTE FUNCTION verify_government_employer();

-- 8. Create function to validate job_category based on employer
CREATE OR REPLACE FUNCTION public.validate_job_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employer_is_gov BOOLEAN;
BEGIN
  -- Get employer government status
  SELECT is_government INTO employer_is_gov
  FROM employers
  WHERE id = NEW.employer_id;
  
  -- Non-government employers can only post private jobs
  IF NEW.job_category = 'government' AND (employer_is_gov IS NULL OR employer_is_gov = false) THEN
    RAISE EXCEPTION 'Only verified government employers can post government jobs';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Create trigger to validate job category
DROP TRIGGER IF EXISTS validate_job_category_trigger ON jobs;
CREATE TRIGGER validate_job_category_trigger
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_category();

-- 10. Create index for faster government job queries
CREATE INDEX IF NOT EXISTS idx_jobs_job_category ON jobs(job_category);
CREATE INDEX IF NOT EXISTS idx_employers_is_government ON employers(is_government);