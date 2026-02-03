-- Create job_categories table for admin-managed categories
CREATE TABLE public.job_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;

-- Public can view active categories
CREATE POLICY "Public can view active job categories"
ON public.job_categories
FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage all job categories"
ON public.job_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_job_categories_updated_at
BEFORE UPDATE ON public.job_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial job categories
INSERT INTO public.job_categories (name, description, icon, sort_order) VALUES
  ('Information Technology', 'Software, IT support, networking', 'laptop', 1),
  ('Healthcare', 'Medical, nursing, healthcare services', 'heart-pulse', 2),
  ('Education', 'Teaching, training, education services', 'graduation-cap', 3),
  ('Finance', 'Banking, accounting, financial services', 'banknote', 4),
  ('Engineering', 'Civil, mechanical, electrical engineering', 'wrench', 5),
  ('Sales & Marketing', 'Sales, marketing, advertising', 'megaphone', 6),
  ('Customer Service', 'Support, call center, customer relations', 'headphones', 7),
  ('Manufacturing', 'Production, assembly, quality control', 'factory', 8),
  ('Construction', 'Building, construction, trades', 'hard-hat', 9),
  ('Transportation', 'Driving, logistics, delivery', 'truck', 10),
  ('Hospitality', 'Hotels, restaurants, tourism', 'utensils', 11),
  ('Retail', 'Store, shop, merchandise', 'shopping-bag', 12),
  ('Administrative', 'Office work, clerical, data entry', 'file-text', 13),
  ('Legal', 'Law, paralegal, legal services', 'scale', 14),
  ('Government', 'Public sector, civil service', 'landmark', 15);