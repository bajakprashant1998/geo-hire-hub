
-- =============================================
-- EMPLOYER SYSTEM DATABASE MIGRATION
-- =============================================

-- 1. EMPLOYER PLANS TABLE
CREATE TABLE public.employer_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2),
  max_active_jobs INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employer_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active plans"
  ON public.employer_plans FOR SELECT
  USING (is_active = true);

-- Insert default plans
INSERT INTO public.employer_plans (name, description, price_monthly, price_yearly, max_active_jobs, features, sort_order) VALUES
  ('Free', 'Get started with basic features', 0, 0, 1, '["1 active job", "Basic applicant tracking", "Email support"]'::jsonb, 1),
  ('Professional', 'For growing businesses', 49.99, 499.99, 5, '["5 active jobs", "Priority listing", "Advanced analytics", "Priority support"]'::jsonb, 2),
  ('Enterprise', 'For large organizations', 199.99, 1999.99, 50, '["50 active jobs", "Featured listings", "Full analytics suite", "Dedicated support", "Custom branding"]'::jsonb, 3);

-- 2. EMPLOYER SUBSCRIPTIONS TABLE
CREATE TABLE public.employer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.employer_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employer_id)
);

-- Enable RLS
ALTER TABLE public.employer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Employers can view their own subscription
CREATE POLICY "Employers can view their own subscription"
  ON public.employer_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE e.id = employer_subscriptions.employer_id AND p.user_id = auth.uid()
  ));

-- 3. UPDATE EMPLOYERS TABLE WITH NEW FIELDS
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS office_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS business_card_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- 4. UPDATE JOBS TABLE WITH NEW FIELDS
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 5. APPLICATION NOTES TABLE (for private employer notes on candidates)
CREATE TABLE public.application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

-- Employers can CRUD their own notes
CREATE POLICY "Employers can view their own notes"
  ON public.application_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE e.id = application_notes.employer_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Employers can create their own notes"
  ON public.application_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE e.id = application_notes.employer_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Employers can update their own notes"
  ON public.application_notes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE e.id = application_notes.employer_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Employers can delete their own notes"
  ON public.application_notes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE e.id = application_notes.employer_id AND p.user_id = auth.uid()
  ));

-- 6. JOB VIEWS TRACKING TABLE
CREATE TABLE public.job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT
);

-- Enable RLS
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can record job views"
  ON public.job_views FOR INSERT
  WITH CHECK (true);

-- Employers can view stats for their jobs
CREATE POLICY "Employers can view their job views"
  ON public.job_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.employers e ON j.employer_id = e.id
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE j.id = job_views.job_id AND p.user_id = auth.uid()
  ));

-- 7. CREATE STORAGE BUCKET FOR EMPLOYER DOCUMENTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employer-documents', 'employer-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employer documents
CREATE POLICY "Employers can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'employer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view employer documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employer-documents');

CREATE POLICY "Employers can update their documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'employer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Employers can delete their documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'employer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. FUNCTION TO CALCULATE EMPLOYER PROFILE COMPLETENESS
CREATE OR REPLACE FUNCTION public.calculate_employer_profile_completeness(p_employer_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completeness INTEGER := 0;
  emp RECORD;
  prof RECORD;
BEGIN
  SELECT * INTO emp FROM public.employers WHERE id = p_employer_id;
  SELECT * INTO prof FROM public.profiles WHERE id = emp.profile_id;
  
  IF emp IS NULL THEN RETURN 0; END IF;
  
  -- Company name (required, 15%)
  IF emp.company_name IS NOT NULL AND LENGTH(TRIM(emp.company_name)) > 0 THEN
    completeness := completeness + 15;
  END IF;
  
  -- Industry (15%)
  IF emp.industry IS NOT NULL AND LENGTH(TRIM(emp.industry)) > 0 THEN
    completeness := completeness + 15;
  END IF;
  
  -- Description (15%)
  IF emp.description IS NOT NULL AND LENGTH(TRIM(emp.description)) > 20 THEN
    completeness := completeness + 15;
  END IF;
  
  -- Tax ID (15%)
  IF emp.tax_id IS NOT NULL AND LENGTH(TRIM(emp.tax_id)) > 0 THEN
    completeness := completeness + 15;
  END IF;
  
  -- Country code (10%)
  IF emp.country_code IS NOT NULL AND LENGTH(TRIM(emp.country_code)) > 0 THEN
    completeness := completeness + 10;
  END IF;
  
  -- Office photo (15%)
  IF emp.office_photo_url IS NOT NULL THEN
    completeness := completeness + 15;
  END IF;
  
  -- Business card (15%)
  IF emp.business_card_url IS NOT NULL THEN
    completeness := completeness + 15;
  END IF;
  
  RETURN completeness;
END;
$$;

-- 9. FUNCTION TO CHECK IF EMPLOYER CAN ACTIVATE JOB
CREATE OR REPLACE FUNCTION public.can_employer_activate_job(p_employer_id UUID, p_exclude_job_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
  max_allowed INTEGER;
  plan_name TEXT;
  sub RECORD;
BEGIN
  -- Get employer's subscription and plan
  SELECT es.*, ep.max_active_jobs, ep.name INTO sub
  FROM public.employer_subscriptions es
  JOIN public.employer_plans ep ON es.plan_id = ep.id
  WHERE es.employer_id = p_employer_id AND es.status = 'active';
  
  -- Default to free plan if no subscription
  IF sub IS NULL THEN
    max_allowed := 1;
    plan_name := 'Free';
  ELSE
    max_allowed := sub.max_active_jobs;
    plan_name := sub.name;
  END IF;
  
  -- Count current active jobs (excluding the one being toggled)
  SELECT COUNT(*) INTO active_count
  FROM public.jobs
  WHERE employer_id = p_employer_id 
    AND is_active = true 
    AND status = 'open'
    AND (p_exclude_job_id IS NULL OR id != p_exclude_job_id);
  
  RETURN jsonb_build_object(
    'can_activate', active_count < max_allowed,
    'active_count', active_count,
    'max_allowed', max_allowed,
    'plan_name', plan_name
  );
END;
$$;

-- 10. FUNCTION TO GET JOB ANALYTICS
CREATE OR REPLACE FUNCTION public.get_job_analytics(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  view_count INTEGER;
  app_count INTEGER;
  shortlist_count INTEGER;
  hired_count INTEGER;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.employers e ON j.employer_id = e.id
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE j.id = p_job_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT COUNT(*) INTO view_count FROM public.job_views WHERE job_id = p_job_id;
  SELECT COUNT(*) INTO app_count FROM public.applications WHERE job_id = p_job_id;
  SELECT COUNT(*) INTO shortlist_count FROM public.applications WHERE job_id = p_job_id AND status = 'shortlisted';
  SELECT COUNT(*) INTO hired_count FROM public.applications WHERE job_id = p_job_id AND status = 'hired';
  
  RETURN jsonb_build_object(
    'views', view_count,
    'applications', app_count,
    'shortlisted', shortlist_count,
    'hired', hired_count
  );
END;
$$;

-- 11. TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_employer_plans_updated_at
  BEFORE UPDATE ON public.employer_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employer_subscriptions_updated_at
  BEFORE UPDATE ON public.employer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_application_notes_updated_at
  BEFORE UPDATE ON public.application_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. AUTO-CREATE FREE SUBSCRIPTION FOR NEW EMPLOYERS
CREATE OR REPLACE FUNCTION public.create_free_subscription_for_employer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM public.employer_plans WHERE name = 'Free' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.employer_subscriptions (employer_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'active');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_employer_subscription
  AFTER INSERT ON public.employers
  FOR EACH ROW EXECUTE FUNCTION public.create_free_subscription_for_employer();
