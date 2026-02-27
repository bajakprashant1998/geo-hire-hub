
-- Phase 1: AI-Driven Employer Verification Schema

-- 1. New table: employer_verification_checks
CREATE TABLE public.employer_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  score integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employer_verification_checks ENABLE ROW LEVEL SECURITY;

-- Admins can see all checks
CREATE POLICY "Admins can view all verification checks"
ON public.employer_verification_checks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Employers can see their own checks
CREATE POLICY "Employers can view own verification checks"
ON public.employer_verification_checks
FOR SELECT
TO authenticated
USING (
  employer_id IN (
    SELECT e.id FROM public.employers e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Only service role inserts (via edge function)
CREATE POLICY "Service role can insert verification checks"
ON public.employer_verification_checks
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. New table: employer_blacklist
CREATE TABLE public.employer_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  value text NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

ALTER TABLE public.employer_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blacklist"
ON public.employer_blacklist
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Alter employers table - add verification columns
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS google_business_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_registration_url text,
  ADD COLUMN IF NOT EXISTS gst_license_url text,
  ADD COLUMN IF NOT EXISTS pan_url text,
  ADD COLUMN IF NOT EXISTS last_verification_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_reverification_at timestamptz;

-- 4. Create index for faster lookups
CREATE INDEX idx_verification_checks_employer ON public.employer_verification_checks(employer_id);
CREATE INDEX idx_blacklist_type_value ON public.employer_blacklist(type, value);
