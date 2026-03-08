
CREATE TABLE public.spotlight_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  author_name TEXT,
  author_role TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spotlight_stories ENABLE ROW LEVEL SECURITY;

-- Anyone can read published stories
CREATE POLICY "Anyone can view published stories"
ON public.spotlight_stories FOR SELECT
USING (is_published = true);

-- Employers can manage their own stories
CREATE POLICY "Employers can insert own stories"
ON public.spotlight_stories FOR INSERT TO authenticated
WITH CHECK (employer_id = get_current_user_employer_id());

CREATE POLICY "Employers can update own stories"
ON public.spotlight_stories FOR UPDATE TO authenticated
USING (employer_id = get_current_user_employer_id());

CREATE POLICY "Employers can delete own stories"
ON public.spotlight_stories FOR DELETE TO authenticated
USING (employer_id = get_current_user_employer_id());

-- Admins full access
CREATE POLICY "Admins can manage all stories"
ON public.spotlight_stories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_spotlight_stories_employer ON public.spotlight_stories(employer_id);
CREATE INDEX idx_spotlight_stories_published ON public.spotlight_stories(is_published, created_at DESC);
