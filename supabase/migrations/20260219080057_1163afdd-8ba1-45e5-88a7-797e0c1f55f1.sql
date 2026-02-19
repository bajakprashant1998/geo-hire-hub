
-- Profile views tracking
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_created_at ON public.profile_views(created_at);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own profile view stats" ON public.profile_views FOR SELECT USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all profile views" ON public.profile_views FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Application status change notification trigger
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  candidate_user_id uuid;
  job_title text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT p.user_id INTO candidate_user_id
    FROM candidates c JOIN profiles p ON c.profile_id = p.id
    WHERE c.id = NEW.candidate_id;

    SELECT j.title INTO job_title FROM jobs j WHERE j.id = NEW.job_id;

    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      candidate_user_id,
      'application_update',
      'Application Status Updated',
      'Your application for "' || COALESCE(job_title, 'a job') || '" has been ' || NEW.status,
      '/candidate-dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_status_change();
