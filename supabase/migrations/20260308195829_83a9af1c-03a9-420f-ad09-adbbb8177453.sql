
-- Portfolio projects table
CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'project', -- 'project' or 'case_study'
  tech_stack TEXT[] DEFAULT '{}',
  live_url TEXT,
  repo_url TEXT,
  thumbnail_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  problem_statement TEXT,
  solution TEXT,
  results TEXT,
  metrics JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD
CREATE POLICY "Candidates can manage own portfolio"
  ON public.portfolio_projects FOR ALL
  TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id())
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

-- Public read for portfolio showcase
CREATE POLICY "Anyone can view portfolio projects"
  ON public.portfolio_projects FOR SELECT
  TO anon, authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_projects_updated_at
  BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for portfolio media
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-media', 'portfolio-media', true);

-- Storage policies
CREATE POLICY "Users can upload portfolio media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio-media');

CREATE POLICY "Users can update own portfolio media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own portfolio media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view portfolio media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'portfolio-media');
