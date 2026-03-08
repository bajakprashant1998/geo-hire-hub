
-- Badge definitions table
CREATE TABLE public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  color TEXT NOT NULL DEFAULT 'primary',
  category TEXT NOT NULL DEFAULT 'achievement',
  criteria JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User earned badges table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(profile_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badge definitions are publicly readable
CREATE POLICY "Badge definitions are publicly readable"
  ON public.badge_definitions FOR SELECT
  TO authenticated
  USING (true);

-- Users can read all badges (for profile display)
CREATE POLICY "User badges are publicly readable"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert badges (via edge function)
CREATE POLICY "System can manage user badges"
  ON public.user_badges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can see their own badges for insert context
CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Seed badge definitions
INSERT INTO public.badge_definitions (key, name, description, icon, color, category, criteria, sort_order) VALUES
  ('quick_responder', 'Quick Responder', 'Responds to messages within 1 hour on average', 'zap', 'warning', 'engagement', '{"avg_response_minutes": 60}', 1),
  ('top_applicant', 'Top Applicant', 'Applied to 25+ jobs with a high success rate', 'trophy', 'primary', 'achievement', '{"min_applications": 25}', 2),
  ('verified_pro', 'Verified Pro', 'Completed profile verification and all assessments', 'shield-check', 'success', 'trust', '{"profile_complete": true, "verified": true}', 3),
  ('early_bird', 'Early Bird', 'Among the first 10 applicants on 5+ jobs', 'sunrise', 'warning', 'engagement', '{"early_applications": 5}', 4),
  ('skill_master', 'Skill Master', 'Passed 3 or more skill assessments', 'graduation-cap', 'primary', 'achievement', '{"assessments_passed": 3}', 5),
  ('profile_star', 'Profile Star', 'Achieved 100% profile completeness', 'star', 'warning', 'achievement', '{"completeness": 100}', 6),
  ('networker', 'Networker', 'Connected with 10+ employers via messages', 'users', 'accent', 'engagement', '{"connections": 10}', 7),
  ('interview_ace', 'Interview Ace', 'Completed 5+ interviews successfully', 'award', 'success', 'achievement', '{"interviews_completed": 5}', 8);
