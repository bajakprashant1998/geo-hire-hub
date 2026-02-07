
-- Platform notifications table
CREATE TABLE public.platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  target_audience TEXT DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Content moderation queue
CREATE TABLE public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature flags table
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for platform_notifications type
CREATE OR REPLACE FUNCTION public.validate_platform_notification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.type NOT IN ('info', 'warning', 'success', 'error') THEN
    RAISE EXCEPTION 'Invalid notification type: %', NEW.type;
  END IF;
  IF NEW.target_audience NOT IN ('all', 'candidates', 'employers') THEN
    RAISE EXCEPTION 'Invalid target audience: %', NEW.target_audience;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_platform_notification_trigger
BEFORE INSERT OR UPDATE ON public.platform_notifications
FOR EACH ROW EXECUTE FUNCTION public.validate_platform_notification();

-- Validation trigger for moderation_queue
CREATE OR REPLACE FUNCTION public.validate_moderation_queue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.content_type NOT IN ('job', 'profile', 'message') THEN
    RAISE EXCEPTION 'Invalid content type: %', NEW.content_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'escalated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_moderation_queue_trigger
BEFORE INSERT OR UPDATE ON public.moderation_queue
FOR EACH ROW EXECUTE FUNCTION public.validate_moderation_queue();

-- RLS for platform_notifications
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform notifications"
ON public.platform_notifications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active notifications"
ON public.platform_notifications
FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS for moderation_queue
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moderation queue"
ON public.moderation_queue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Update timestamp trigger for feature_flags
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default feature flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('job_alerts', true, 'Enable job alert notifications for candidates'),
  ('ai_resume_builder', true, 'Enable AI resume builder feature'),
  ('audio_resumes', true, 'Enable audio resume generation'),
  ('messaging', true, 'Enable in-app messaging between users'),
  ('map_view', true, 'Enable map view for jobs and candidates'),
  ('maintenance_mode', false, 'Put the platform in maintenance mode');
