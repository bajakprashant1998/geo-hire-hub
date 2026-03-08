
-- Function to auto-award a skill badge when a candidate passes an assessment
CREATE OR REPLACE FUNCTION public.award_skill_badge_on_pass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_badge_id uuid;
  v_profile_id uuid;
  v_assessment_title text;
  v_skill_category text;
BEGIN
  -- Only process passed results
  IF NOT NEW.passed THEN
    RETURN NEW;
  END IF;

  -- Get the candidate's profile_id
  SELECT profile_id INTO v_profile_id
  FROM public.candidates WHERE id = NEW.candidate_id;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get assessment info
  SELECT title, skill_category INTO v_assessment_title, v_skill_category
  FROM public.skill_assessments WHERE id = NEW.assessment_id;

  -- Find or create a badge definition for this skill category
  SELECT id INTO v_badge_id
  FROM public.badge_definitions
  WHERE key = 'skill_verified_' || LOWER(REPLACE(REPLACE(v_skill_category, ' ', '_'), '-', '_'))
    AND category = 'skills';

  -- If no badge definition exists for this skill category, create one
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badge_definitions (key, name, description, icon, color, category, is_active, sort_order)
    VALUES (
      'skill_verified_' || LOWER(REPLACE(REPLACE(v_skill_category, ' ', '_'), '-', '_')),
      v_skill_category || ' Verified',
      'Passed a ' || v_skill_category || ' skill assessment',
      'shield-check',
      'success',
      'skills',
      true,
      100
    )
    RETURNING id INTO v_badge_id;
  END IF;

  -- Award the badge (ignore if already earned)
  INSERT INTO public.user_badges (profile_id, badge_id)
  VALUES (v_profile_id, v_badge_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on assessment_results
DROP TRIGGER IF EXISTS trg_award_skill_badge ON public.assessment_results;
CREATE TRIGGER trg_award_skill_badge
  AFTER INSERT ON public.assessment_results
  FOR EACH ROW
  EXECUTE FUNCTION public.award_skill_badge_on_pass();
