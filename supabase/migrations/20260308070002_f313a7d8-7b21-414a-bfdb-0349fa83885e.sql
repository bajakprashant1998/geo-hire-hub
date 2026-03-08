
CREATE TABLE public.interview_prep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  company_name text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_score integer,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_prep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own prep sessions"
  ON public.interview_prep_sessions FOR SELECT
  TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can create own prep sessions"
  ON public.interview_prep_sessions FOR INSERT
  TO authenticated
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can update own prep sessions"
  ON public.interview_prep_sessions FOR UPDATE
  TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can delete own prep sessions"
  ON public.interview_prep_sessions FOR DELETE
  TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE INDEX idx_interview_prep_candidate ON public.interview_prep_sessions(candidate_id);
CREATE INDEX idx_interview_prep_job ON public.interview_prep_sessions(job_id);
