
-- Create a trigger function that handles user_type changes on profile UPDATE
CREATE OR REPLACE FUNCTION public.handle_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when user_type actually changes
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    IF NEW.user_type = 'employer' THEN
      INSERT INTO public.employers (profile_id, company_name)
      VALUES (NEW.id, 'My Company')
      ON CONFLICT (profile_id) DO NOTHING;
    ELSIF NEW.user_type = 'candidate' THEN
      INSERT INTO public.candidates (profile_id, job_title)
      VALUES (NEW.id, 'Not specified')
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger to profiles table
CREATE TRIGGER on_profile_role_change
AFTER UPDATE OF user_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_role_change();
