
-- Auto-approve reviews by default
ALTER TABLE public.company_reviews ALTER COLUMN is_approved SET DEFAULT true;

-- Approve existing pending reviews
UPDATE public.company_reviews SET is_approved = true WHERE is_approved = false;
