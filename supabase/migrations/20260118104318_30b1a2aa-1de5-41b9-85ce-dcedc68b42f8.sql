-- Add moderation fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid,
ADD COLUMN IF NOT EXISTS moderated_at timestamp with time zone;

-- Add blocking fields to candidates table
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_by uuid;

-- Add blocking fields to employers table
ALTER TABLE public.employers
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- Create admin action logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view action logs
CREATE POLICY "Admins can view action logs"
ON public.admin_action_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert action logs
CREATE POLICY "Admins can insert action logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create employer reports table
CREATE TABLE IF NOT EXISTS public.employer_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.employer_reports ENABLE ROW LEVEL SECURITY;

-- Candidates can create reports
CREATE POLICY "Candidates can create reports"
ON public.employer_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.employer_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.employer_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.employer_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create job reports table
CREATE TABLE IF NOT EXISTS public.job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;

-- Users can create job reports
CREATE POLICY "Users can create job reports"
ON public.job_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own job reports
CREATE POLICY "Users can view their own job reports"
ON public.job_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all job reports
CREATE POLICY "Admins can view all job reports"
ON public.job_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update job reports
CREATE POLICY "Admins can update job reports"
ON public.job_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create global settings table for resume visibility rules etc.
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings"
ON public.admin_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can update settings"
ON public.admin_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.admin_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create admin-specific RLS policies for full access
-- Admins can view all jobs regardless of status
CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any job
CREATE POLICY "Admins can update any job"
ON public.jobs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any job
CREATE POLICY "Admins can delete any job"
ON public.jobs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all employers
CREATE POLICY "Admins can view all employers"
ON public.employers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any employer
CREATE POLICY "Admins can update any employer"
ON public.employers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all candidates
CREATE POLICY "Admins can view all candidates"
ON public.candidates
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any candidate
CREATE POLICY "Admins can update any candidate"
ON public.candidates
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage plans
CREATE POLICY "Admins can insert plans"
ON public.employer_plans
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.employer_plans
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
ON public.employer_plans
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.employer_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any subscription"
ON public.employer_subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON public.employer_subscriptions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default admin settings
INSERT INTO public.admin_settings (key, value, description) VALUES
('resume_visibility', '{"require_employer_approval": true, "hide_contact_until_applied": true}'::jsonb, 'Global resume visibility settings'),
('job_moderation', '{"require_approval": false, "auto_expire_days": 30}'::jsonb, 'Job moderation settings'),
('employer_verification', '{"require_tax_id": true, "require_documents": true}'::jsonb, 'Employer verification requirements')
ON CONFLICT (key) DO NOTHING;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can log actions';
  END IF;
  
  INSERT INTO public.admin_action_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), p_action_type, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to get admin dashboard stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view dashboard stats';
  END IF;
  
  SELECT jsonb_build_object(
    'total_employers', (SELECT COUNT(*) FROM employers),
    'pending_employers', (SELECT COUNT(*) FROM employers WHERE verification_status = 'pending'),
    'approved_employers', (SELECT COUNT(*) FROM employers WHERE verification_status = 'approved'),
    'suspended_employers', (SELECT COUNT(*) FROM employers WHERE is_suspended = true),
    'total_jobs', (SELECT COUNT(*) FROM jobs),
    'active_jobs', (SELECT COUNT(*) FROM jobs WHERE is_active = true AND status = 'open'),
    'pending_moderation', (SELECT COUNT(*) FROM jobs WHERE moderation_status = 'pending'),
    'total_candidates', (SELECT COUNT(*) FROM candidates),
    'blocked_candidates', (SELECT COUNT(*) FROM candidates WHERE is_blocked = true),
    'total_applications', (SELECT COUNT(*) FROM applications),
    'pending_reports', (SELECT COUNT(*) FROM employer_reports WHERE status = 'pending') + (SELECT COUNT(*) FROM job_reports WHERE status = 'pending'),
    'revenue_this_month', (
      SELECT COALESCE(SUM(ep.price_monthly), 0)
      FROM employer_subscriptions es
      JOIN employer_plans ep ON es.plan_id = ep.id
      WHERE es.status = 'active'
      AND es.current_period_start >= date_trunc('month', now())
    ),
    'new_registrations_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('day', now())),
    'new_registrations_week', (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('week', now()))
  ) INTO stats;
  
  RETURN stats;
END;
$$;