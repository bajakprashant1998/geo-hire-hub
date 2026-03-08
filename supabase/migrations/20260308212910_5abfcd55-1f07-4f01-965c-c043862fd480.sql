-- Track when candidates appear in employer search results
CREATE TABLE public.search_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  searcher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  search_query text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_appearances_candidate ON public.search_appearances(candidate_id);
CREATE INDEX idx_search_appearances_created ON public.search_appearances(created_at);

ALTER TABLE public.search_appearances ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own search appearances
CREATE POLICY "Candidates can view own search appearances"
  ON public.search_appearances FOR SELECT
  USING (candidate_id = public.get_current_user_candidate_id());

-- Service role can insert (from edge functions / search tracking)
CREATE POLICY "Service role inserts search appearances"
  ON public.search_appearances FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all search appearances"
  ON public.search_appearances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Also add index on profile_views for time-series queries
CREATE INDEX IF NOT EXISTS idx_profile_views_created ON public.profile_views(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON public.profile_views(profile_id);