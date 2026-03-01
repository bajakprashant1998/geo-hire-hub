
-- =============================================
-- 1. COMPANY REVIEWS & RATINGS
-- =============================================
CREATE TABLE public.company_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('employee', 'former_employee', 'interviewee', 'candidate')),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  culture_rating INTEGER CHECK (culture_rating BETWEEN 1 AND 5),
  salary_rating INTEGER CHECK (salary_rating BETWEEN 1 AND 5),
  growth_rating INTEGER CHECK (growth_rating BETWEEN 1 AND 5),
  worklife_rating INTEGER CHECK (worklife_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employer_id, reviewer_id)
);

ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON public.company_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = reviewer_id));

CREATE POLICY "Users can update own reviews"
  ON public.company_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = reviewer_id));

CREATE POLICY "Users can delete own reviews"
  ON public.company_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = reviewer_id));

CREATE POLICY "Admins can manage all reviews"
  ON public.company_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregated ratings view
CREATE OR REPLACE VIEW public.employer_ratings AS
SELECT
  employer_id,
  COUNT(*) AS review_count,
  ROUND(AVG(overall_rating)::numeric, 1) AS avg_overall,
  ROUND(AVG(culture_rating)::numeric, 1) AS avg_culture,
  ROUND(AVG(salary_rating)::numeric, 1) AS avg_salary,
  ROUND(AVG(growth_rating)::numeric, 1) AS avg_growth,
  ROUND(AVG(worklife_rating)::numeric, 1) AS avg_worklife,
  ROUND(AVG(management_rating)::numeric, 1) AS avg_management
FROM public.company_reviews
WHERE is_approved = true
GROUP BY employer_id;

-- =============================================
-- 2. SKILLS ASSESSMENT TESTS
-- =============================================
CREATE TABLE public.skill_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  skill_category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  passing_score INTEGER NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active assessments"
  ON public.skill_assessments FOR SELECT
  USING (is_active = true);

CREATE POLICY "Employers can manage own assessments"
  ON public.skill_assessments FOR ALL
  TO authenticated
  USING (employer_id = public.get_current_user_employer_id());

CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.skill_assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'code_snippet')),
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  explanation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewable with assessment"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employers manage own questions"
  ON public.assessment_questions FOR ALL
  TO authenticated
  USING (assessment_id IN (SELECT id FROM skill_assessments WHERE employer_id = public.get_current_user_employer_id()));

CREATE TABLE public.assessment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.skill_assessments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]',
  time_taken_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, candidate_id, job_id)
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view own results"
  ON public.assessment_results FOR SELECT
  TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id());

CREATE POLICY "Employers view results for their assessments"
  ON public.assessment_results FOR SELECT
  TO authenticated
  USING (assessment_id IN (SELECT id FROM skill_assessments WHERE employer_id = public.get_current_user_employer_id()));

CREATE POLICY "Candidates can submit results"
  ON public.assessment_results FOR INSERT
  TO authenticated
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

-- Link assessments to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.skill_assessments(id) ON DELETE SET NULL;

-- =============================================
-- 3. REFERRAL & REWARDS SYSTEM
-- =============================================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'applied', 'hired', 'expired')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = referrer_id));

CREATE POLICY "Authenticated users create referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = referrer_id));

CREATE POLICY "Users update own referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = referrer_id));

CREATE POLICY "Admins manage all referrals"
  ON public.referrals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.reward_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  description TEXT,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own points"
  ON public.reward_points FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = user_id));

CREATE POLICY "System can insert points"
  ON public.reward_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = reward_points.user_id));

-- =============================================
-- 4. AI SCREENING SCORES (extend job_matches)
-- =============================================
ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS ai_screening_score NUMERIC(5,2);
ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS screening_summary TEXT;
ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS skill_gaps JSONB DEFAULT '[]';
ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS recommendation TEXT CHECK (recommendation IN ('strong_match', 'good_match', 'potential', 'not_recommended'));

-- =============================================
-- 5. APPLICATION TRACKER STAGES (extend applications)
-- =============================================
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS kanban_stage TEXT NOT NULL DEFAULT 'applied' CHECK (kanban_stage IN ('wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'));
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS candidate_notes TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_reviews_employer ON public.company_reviews(employer_id);
CREATE INDEX IF NOT EXISTS idx_company_reviews_approved ON public.company_reviews(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_assessment_results_candidate ON public.assessment_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment ON public.assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_reward_points_user ON public.reward_points(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_kanban ON public.applications(candidate_id, kanban_stage);

-- Triggers for updated_at
CREATE TRIGGER update_company_reviews_updated_at BEFORE UPDATE ON public.company_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_skill_assessments_updated_at BEFORE UPDATE ON public.skill_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
