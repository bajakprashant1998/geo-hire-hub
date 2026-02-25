
-- Auto Apply Preferences table
CREATE TABLE public.auto_apply_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  match_threshold INTEGER NOT NULL DEFAULT 70,
  preferred_titles TEXT[] NOT NULL DEFAULT '{}',
  focus_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  remote_only BOOLEAN NOT NULL DEFAULT false,
  min_salary TEXT,
  salary_currency TEXT NOT NULL DEFAULT 'INR',
  company_size_preference TEXT[] NOT NULL DEFAULT '{}',
  industry_preference TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT,
  daily_limit INTEGER NOT NULL DEFAULT 5,
  generate_cover_letter BOOLEAN NOT NULL DEFAULT true,
  location_radius TEXT NOT NULL DEFAULT 'city',
  excluded_companies TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT auto_apply_preferences_candidate_id_key UNIQUE (candidate_id)
);

-- Auto Apply Logs table
CREATE TABLE public.auto_apply_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0,
  cover_letter TEXT,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  skip_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_apply_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_apply_logs ENABLE ROW LEVEL SECURITY;

-- RLS for auto_apply_preferences
CREATE POLICY "Candidates can view their own auto-apply preferences"
  ON public.auto_apply_preferences FOR SELECT
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can insert their own auto-apply preferences"
  ON public.auto_apply_preferences FOR INSERT
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can update their own auto-apply preferences"
  ON public.auto_apply_preferences FOR UPDATE
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can delete their own auto-apply preferences"
  ON public.auto_apply_preferences FOR DELETE
  USING (candidate_id = public.get_current_user_candidate_id());

-- RLS for auto_apply_logs
CREATE POLICY "Candidates can view their own auto-apply logs"
  ON public.auto_apply_logs FOR SELECT
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can insert their own auto-apply logs"
  ON public.auto_apply_logs FOR INSERT
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Candidates can update their own auto-apply logs"
  ON public.auto_apply_logs FOR UPDATE
  USING (candidate_id = public.get_current_user_candidate_id());

-- Trigger for updated_at on preferences
CREATE TRIGGER update_auto_apply_preferences_updated_at
  BEFORE UPDATE ON public.auto_apply_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
