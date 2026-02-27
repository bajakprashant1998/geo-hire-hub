
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins can read all email logs"
ON public.email_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own logs
CREATE POLICY "Users can read own email logs"
ON public.email_logs FOR SELECT
USING (auth.uid() = recipient_user_id);

-- Service role inserts (edge function uses service role)
CREATE POLICY "Service role can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_user_id);
CREATE INDEX idx_email_logs_template ON public.email_logs(template_key);
CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);

-- Add missing email templates
INSERT INTO public.email_templates (template_key, subject, html_body, description, variables, is_active)
VALUES
  ('job_application_submitted', 'Your Application Has Been Submitted', '<h2>Application Submitted!</h2><p>Hi {{candidate_name}},</p><p>Your application for <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong> has been successfully submitted.</p><p>We''ll notify you when there''s an update on your application.</p>', 'Sent to candidate when they apply for a job', ARRAY['candidate_name', 'job_title', 'company_name'], true),
  ('new_message', 'You Have a New Message', '<h2>New Message</h2><p>Hi {{recipient_name}},</p><p>You have a new message from <strong>{{sender_name}}</strong>.</p><p>"{{message_preview}}"</p>', 'Sent when a user receives a new message', ARRAY['recipient_name', 'sender_name', 'message_preview'], true),
  ('employer_welcome', 'Welcome to Hire for Job – Employer Account', '<h2>Welcome to Hire for Job!</h2><p>Hi {{employer_name}},</p><p>Your employer account has been created. Once your company profile is verified by our team, you can start posting jobs and finding great candidates.</p><p>Complete your company profile to get started!</p>', 'Sent to new employer on registration', ARRAY['employer_name'], true),
  ('interview_request', 'Interview Request Received', '<h2>Interview Request</h2><p>Hi {{employer_name}},</p><p><strong>{{candidate_name}}</strong> has requested an interview for the position <strong>{{job_title}}</strong>.</p><p>Scheduled: {{interview_date}} at {{interview_time}}</p>', 'Sent to employer when candidate requests interview', ARRAY['employer_name', 'candidate_name', 'job_title', 'interview_date', 'interview_time'], true),
  ('job_post_approved', 'Your Job Post Is Live', '<h2>Job Post Approved!</h2><p>Hi {{employer_name}},</p><p>Your job posting for <strong>{{job_title}}</strong> has been approved and is now live on Hire for Job.</p><p>Candidates can now discover and apply for this position.</p>', 'Sent when admin approves a job post', ARRAY['employer_name', 'job_title'], true)
ON CONFLICT (template_key) DO NOTHING;

-- Create trigger function that fires on notification insert and calls edge function
CREATE OR REPLACE FUNCTION public.trigger_email_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_key TEXT;
  variables JSONB;
  edge_url TEXT;
  service_key TEXT;
BEGIN
  -- Map notification type to template key
  CASE NEW.type
    WHEN 'application_update' THEN template_key := 'application_status';
    WHEN 'interview_scheduled' THEN template_key := 'interview_scheduled';
    WHEN 'interview_confirmed' THEN template_key := 'interview_scheduled';
    WHEN 'interview_request' THEN template_key := 'interview_request';
    WHEN 'interview_cancelled' THEN template_key := 'application_status';
    WHEN 'interview_rescheduled' THEN template_key := 'interview_scheduled';
    WHEN 'interview_rejected' THEN template_key := 'application_status';
    WHEN 'new_message' THEN template_key := 'new_message';
    ELSE
      -- Unknown type, skip email
      RETURN NEW;
  END CASE;

  -- Build variables from notification data
  variables := jsonb_build_object(
    'notification_title', COALESCE(NEW.title, ''),
    'notification_message', COALESCE(NEW.message, ''),
    'link', COALESCE(NEW.link, '')
  );

  -- Get Supabase URL and service key
  edge_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try env
  IF edge_url IS NULL OR edge_url = '' THEN
    edge_url := 'https://pzcecjuxiorqcmbtiipq.supabase.co';
  END IF;

  -- Call edge function via pg_net
  PERFORM extensions.http_post(
    url := edge_url || '/functions/v1/send-notification-email',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'template_key', template_key,
      'variables', variables
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, current_setting('supabase.service_role_key', true))
    )::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the notification insert if email fails
  RAISE WARNING 'Email trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_email_after_notification ON public.notifications;
CREATE TRIGGER trigger_email_after_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_email_on_notification();
