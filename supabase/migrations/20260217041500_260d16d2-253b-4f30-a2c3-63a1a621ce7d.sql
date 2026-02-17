
-- Update meeting link generator to use Google Meet format
-- Since we can't auto-create real Google Meet links, we'll allow manual input
-- and update the trigger to not auto-generate Jitsi links
CREATE OR REPLACE FUNCTION public.generate_meeting_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only set a default placeholder if no meeting link provided for video interviews
  -- Employers should paste their own Google Meet link
  IF NEW.interview_type = 'video' AND (NEW.meeting_link IS NULL OR NEW.meeting_link = '') THEN
    NEW.meeting_link := NULL; -- Leave empty so employer can add Google Meet link
  END IF;
  RETURN NEW;
END;
$function$;
