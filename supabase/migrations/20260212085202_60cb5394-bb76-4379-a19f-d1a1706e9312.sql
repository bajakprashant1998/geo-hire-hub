
-- Drop the existing trigger first, then the function
DROP TRIGGER IF EXISTS set_meeting_link ON public.interviews;
DROP TRIGGER IF EXISTS generate_meeting_link_trigger ON public.interviews;
DROP FUNCTION IF EXISTS public.generate_meeting_link() CASCADE;

-- Create function to generate meeting links for video interviews
CREATE OR REPLACE FUNCTION public.generate_meeting_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interview_type = 'video' AND (NEW.meeting_link IS NULL OR NEW.meeting_link = '') THEN
    NEW.meeting_link := 'https://meet.jit.si/hireforjob-' || replace(NEW.id::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER generate_meeting_link_trigger
BEFORE INSERT ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.generate_meeting_link();

-- Update existing video interviews missing meeting links
UPDATE public.interviews
SET meeting_link = 'https://meet.jit.si/hireforjob-' || replace(id::text, '-', '')
WHERE interview_type = 'video' AND (meeting_link IS NULL OR meeting_link = '');
