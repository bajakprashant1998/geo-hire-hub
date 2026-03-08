
CREATE TABLE public.employer_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid REFERENCES public.employers(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL,
  company_name text NOT NULL,
  avatar_url text,
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employer_testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved testimonials
CREATE POLICY "Public can view approved testimonials"
  ON public.employer_testimonials
  FOR SELECT
  USING (is_approved = true);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
  ON public.employer_testimonials
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Employers can insert their own testimonials
CREATE POLICY "Employers can insert own testimonials"
  ON public.employer_testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (employer_id = get_current_user_employer_id());
