-- Create function to auto-create candidate record when a candidate profile is created
CREATE OR REPLACE FUNCTION public.handle_new_candidate_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'candidate' THEN
    INSERT INTO public.candidates (profile_id, job_title)
    VALUES (NEW.id, 'Not specified')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_candidate_profile_created ON public.profiles;
CREATE TRIGGER on_candidate_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_candidate_profile();

-- Create function to auto-create employer record when an employer profile is created
CREATE OR REPLACE FUNCTION public.handle_new_employer_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'employer' THEN
    INSERT INTO public.employers (profile_id, company_name)
    VALUES (NEW.id, 'My Company')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table for employers
DROP TRIGGER IF EXISTS on_employer_profile_created ON public.profiles;
CREATE TRIGGER on_employer_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_employer_profile();

-- Backfill: Create candidate records for existing candidate profiles that don't have one
INSERT INTO public.candidates (profile_id, job_title)
SELECT p.id, 'Not specified'
FROM public.profiles p
LEFT JOIN public.candidates c ON c.profile_id = p.id
WHERE p.user_type = 'candidate' AND c.id IS NULL;

-- Backfill: Create employer records for existing employer profiles that don't have one
INSERT INTO public.employers (profile_id, company_name)
SELECT p.id, 'My Company'
FROM public.profiles p
LEFT JOIN public.employers e ON e.profile_id = p.id
WHERE p.user_type = 'employer' AND e.id IS NULL;