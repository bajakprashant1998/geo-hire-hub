
CREATE OR REPLACE FUNCTION public.trigger_email_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  template_key_val TEXT;
  payload JSONB;
  edge_url TEXT;
BEGIN
  -- Map notification type to template key
  CASE NEW.type
    WHEN 'application_update' THEN template_key_val := 'application_status';
    WHEN 'interview_scheduled' THEN template_key_val := 'interview_scheduled';
    WHEN 'interview_confirmed' THEN template_key_val := 'interview_scheduled';
    WHEN 'interview_request' THEN template_key_val := 'interview_request';
    WHEN 'interview_cancelled' THEN template_key_val := 'application_status';
    WHEN 'interview_rescheduled' THEN template_key_val := 'interview_scheduled';
    WHEN 'interview_rejected' THEN template_key_val := 'application_status';
    WHEN 'new_message' THEN template_key_val := 'new_message';
    ELSE
      RETURN NEW;
  END CASE;

  edge_url := 'https://pzcecjuxiorqcmbtiipq.supabase.co/functions/v1/send-notification-email';

  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'template_key', template_key_val,
    'variables', jsonb_build_object(
      'notification_title', COALESCE(NEW.title, ''),
      'notification_message', COALESCE(NEW.message, ''),
      'link', COALESCE(NEW.link, '')
    )
  );

  PERFORM net.http_post(
    url := edge_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the failure to email_logs for monitoring
  BEGIN
    INSERT INTO public.email_logs (recipient_email, recipient_user_id, template_key, subject, status, error_message)
    VALUES (
      'unknown',
      NEW.user_id,
      COALESCE(template_key_val, 'unknown'),
      COALESCE(NEW.title, 'Notification Email'),
      'trigger_failed',
      SQLERRM
    );
  EXCEPTION WHEN OTHERS THEN
    -- If even logging fails, just warn
    NULL;
  END;
  RAISE WARNING 'Email trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
