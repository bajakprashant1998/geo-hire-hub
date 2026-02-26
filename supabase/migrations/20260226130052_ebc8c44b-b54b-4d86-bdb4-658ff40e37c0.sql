
-- Table for tracking flagged/suspicious accounts
CREATE TABLE public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL, -- 'employer', 'candidate', 'user'
  target_id uuid NOT NULL,
  flag_type text NOT NULL, -- 'duplicate_tax_id', 'duplicate_company', 'rapid_job_posts', 'bot_applications', 'manual'
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open', -- 'open', 'reviewed', 'dismissed'
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud flags"
  ON public.fraud_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table for scheduled job run tracking
CREATE TABLE public.scheduled_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'success', -- 'success', 'error', 'running'
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled job runs"
  ON public.scheduled_job_runs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_fraud_flags_status ON public.fraud_flags(status);
CREATE INDEX idx_fraud_flags_target ON public.fraud_flags(target_type, target_id);
CREATE INDEX idx_scheduled_job_runs_name ON public.scheduled_job_runs(job_name, started_at DESC);
