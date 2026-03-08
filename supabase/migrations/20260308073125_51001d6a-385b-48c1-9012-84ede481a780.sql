
-- Add referral bounty to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS referral_bounty INTEGER DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS referral_bounty_currency TEXT DEFAULT 'points';

-- Add referred_name to referrals for tracking who was referred
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_name TEXT;

-- Index for bounty jobs
CREATE INDEX IF NOT EXISTS idx_jobs_referral_bounty ON public.jobs(referral_bounty) WHERE referral_bounty > 0;
