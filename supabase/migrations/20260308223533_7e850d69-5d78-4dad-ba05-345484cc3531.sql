
-- Saved search alerts for employers
CREATE TABLE public.employer_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  notify_push boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz DEFAULT NULL,
  matched_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_employer ON public.employer_saved_searches(employer_id);
CREATE INDEX idx_saved_searches_active ON public.employer_saved_searches(is_active) WHERE is_active = true;

ALTER TABLE public.employer_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage own saved searches" ON public.employer_saved_searches
  FOR ALL TO authenticated USING (
    employer_id = public.get_current_user_employer_id()
  ) WITH CHECK (
    employer_id = public.get_current_user_employer_id()
  );

-- Track which candidates have already been notified per search to avoid duplicates
CREATE TABLE public.saved_search_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES public.employer_saved_searches(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  notified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (search_id, candidate_id)
);

CREATE INDEX idx_ssn_search ON public.saved_search_notifications(search_id);

ALTER TABLE public.saved_search_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view own search notifications" ON public.saved_search_notifications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.employer_saved_searches s WHERE s.id = search_id AND s.employer_id = public.get_current_user_employer_id())
  );

-- Trigger to update updated_at
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON public.employer_saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
