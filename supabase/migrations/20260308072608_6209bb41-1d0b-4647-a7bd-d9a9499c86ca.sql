
-- Company Q&A: Questions table
CREATE TABLE public.company_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  asker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company Q&A: Answers table
CREATE TABLE public.company_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.company_questions(id) ON DELETE CASCADE,
  answerer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_verified_employee BOOLEAN NOT NULL DEFAULT false,
  is_employer_official BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_company_questions_employer ON public.company_questions(employer_id);
CREATE INDEX idx_company_questions_asker ON public.company_questions(asker_profile_id);
CREATE INDEX idx_company_answers_question ON public.company_answers(question_id);

-- RLS
ALTER TABLE public.company_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_answers ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions
CREATE POLICY "Anyone can view questions" ON public.company_questions
  FOR SELECT USING (true);

-- Authenticated users can ask questions
CREATE POLICY "Authenticated users can ask questions" ON public.company_questions
  FOR INSERT TO authenticated
  WITH CHECK (asker_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can update their own questions
CREATE POLICY "Users can update own questions" ON public.company_questions
  FOR UPDATE TO authenticated
  USING (asker_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Anyone can read answers
CREATE POLICY "Anyone can view answers" ON public.company_answers
  FOR SELECT USING (true);

-- Authenticated users can answer
CREATE POLICY "Authenticated users can answer" ON public.company_answers
  FOR INSERT TO authenticated
  WITH CHECK (answerer_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can update their own answers
CREATE POLICY "Users can update own answers" ON public.company_answers
  FOR UPDATE TO authenticated
  USING (answerer_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_company_questions_updated_at
  BEFORE UPDATE ON public.company_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_answers_updated_at
  BEFORE UPDATE ON public.company_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
