
-- Platform announcement banners (admin-managed)
CREATE TABLE public.platform_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  target_audience text NOT NULL DEFAULT 'all',
  link_url text,
  link_text text,
  is_active boolean DEFAULT true,
  is_dismissible boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_banners ENABLE ROW LEVEL SECURITY;

-- Everyone can read active banners
CREATE POLICY "Anyone can read active banners" ON public.platform_banners
  FOR SELECT USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));

-- Admins can manage banners
CREATE POLICY "Admins can manage banners" ON public.platform_banners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Company watchlist
CREATE TABLE public.company_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(candidate_id, employer_id)
);

ALTER TABLE public.company_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage own watchlist" ON public.company_watchlist
  FOR ALL TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id())
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

-- Employer branding sections
CREATE TABLE public.employer_branding_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'text',
  title text,
  content text,
  media_url text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.employer_branding_sections ENABLE ROW LEVEL SECURITY;

-- Public read for branding pages
CREATE POLICY "Anyone can view branding sections" ON public.employer_branding_sections
  FOR SELECT USING (is_visible = true);

-- Employers manage their own branding
CREATE POLICY "Employers manage own branding" ON public.employer_branding_sections
  FOR ALL TO authenticated
  USING (employer_id = public.get_current_user_employer_id())
  WITH CHECK (employer_id = public.get_current_user_employer_id());
