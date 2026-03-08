-- Function: process referral after new user signs up
-- Called from client after signup when a referral code was used
CREATE OR REPLACE FUNCTION public.process_referral_signup(p_referral_code text, p_new_user_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Find the pending referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending'
    AND referred_user_id IS NULL;

  IF NOT FOUND THEN
    RETURN; -- silently ignore invalid/used codes
  END IF;

  -- Prevent self-referral
  IF v_referral.referrer_id = p_new_user_profile_id THEN
    RETURN;
  END IF;

  -- Link the referred user
  UPDATE public.referrals
  SET referred_user_id = p_new_user_profile_id,
      status = 'signed_up',
      points_earned = 10,
      updated_at = now()
  WHERE id = v_referral.id;

  -- Award signup points to referrer
  INSERT INTO public.reward_points (user_id, action, points, description, referral_id)
  VALUES (v_referral.referrer_id, 'referral_signup', 10, 'Referral signed up', v_referral.id);
END;
$$;

-- Function: award referral points when application is created
CREATE OR REPLACE FUNCTION public.award_referral_application_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_profile_id uuid;
  v_referral RECORD;
BEGIN
  -- Get the candidate's profile_id
  SELECT profile_id INTO v_candidate_profile_id
  FROM public.candidates WHERE id = NEW.candidate_id;

  -- Find a referral for this user that hasn't yet awarded application points
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_user_id = v_candidate_profile_id
    AND status = 'signed_up'
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.referrals
    SET status = 'applied',
        points_earned = points_earned + 25,
        updated_at = now()
    WHERE id = v_referral.id;

    INSERT INTO public.reward_points (user_id, action, points, description, referral_id)
    VALUES (v_referral.referrer_id, 'referral_applied', 25, 'Referral submitted first application', v_referral.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function: award referral points when candidate is hired
CREATE OR REPLACE FUNCTION public.award_referral_hire_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_profile_id uuid;
  v_referral RECORD;
  v_bounty integer;
BEGIN
  -- Only trigger when status changes to 'hired'
  IF NEW.status != 'hired' OR OLD.status = 'hired' THEN
    RETURN NEW;
  END IF;

  SELECT profile_id INTO v_candidate_profile_id
  FROM public.candidates WHERE id = NEW.candidate_id;

  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_user_id = v_candidate_profile_id
    AND status IN ('signed_up', 'applied')
  LIMIT 1;

  IF FOUND THEN
    -- Check for job-specific bounty
    SELECT COALESCE(referral_bounty, 0) INTO v_bounty
    FROM public.jobs WHERE id = NEW.job_id;

    UPDATE public.referrals
    SET status = 'hired',
        points_earned = points_earned + 100 + COALESCE(v_bounty, 0),
        job_id = COALESCE(referrals.job_id, NEW.job_id),
        updated_at = now()
    WHERE id = v_referral.id;

    INSERT INTO public.reward_points (user_id, action, points, description, referral_id)
    VALUES (v_referral.referrer_id, 'referral_hired', 100 + COALESCE(v_bounty, 0),
      'Referral got hired' || CASE WHEN v_bounty > 0 THEN ' (+ ' || v_bounty || ' bounty)' ELSE '' END,
      v_referral.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER trg_referral_application_points
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_application_points();

CREATE TRIGGER trg_referral_hire_points
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_hire_points();