
-- Track which deadline reminders have been sent to avoid duplicates
CREATE TABLE public.deadline_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('3_day', '1_day')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id, reminder_type)
);

CREATE INDEX idx_deadline_reminders_candidate ON public.deadline_reminders_sent(candidate_id);
CREATE INDEX idx_deadline_reminders_job ON public.deadline_reminders_sent(job_id);

ALTER TABLE public.deadline_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only service role inserts (from edge function), users can read their own
CREATE POLICY "Users can view own reminders" ON public.deadline_reminders_sent
  FOR SELECT TO authenticated USING (
    candidate_id = public.get_current_user_candidate_id()
  );
