
-- Add new columns to interviews table for two-way scheduling
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS requested_by text NOT NULL DEFAULT 'employer',
  ADD COLUMN IF NOT EXISTS candidate_message text,
  ADD COLUMN IF NOT EXISTS employer_notes text,
  ADD COLUMN IF NOT EXISTS confirmed_by_candidate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_by_employer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rescheduled_from uuid REFERENCES public.interviews(id),
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update existing interviews to mark employer as requester and confirmed
UPDATE public.interviews SET requested_by = 'employer', confirmed_by_employer = true WHERE requested_by = 'employer';

-- RLS: Candidates can INSERT interviews (request) only for jobs they applied to
CREATE POLICY "Candidates can request interviews"
  ON public.interviews
  FOR INSERT
  WITH CHECK (
    requested_by = 'candidate'
    AND candidate_id = public.get_current_user_candidate_id()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.candidate_id = public.get_current_user_candidate_id()
        AND a.job_id = interviews.job_id
        AND a.status IN ('pending', 'reviewing', 'shortlisted')
    )
  );

-- RLS: Candidates can UPDATE their own interviews (confirm/cancel only)
CREATE POLICY "Candidates can update their interviews"
  ON public.interviews
  FOR UPDATE
  USING (candidate_id = public.get_current_user_candidate_id());

-- Anti-spam validation trigger
CREATE OR REPLACE FUNCTION public.validate_interview_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $func$
DECLARE
  existing_count INTEGER;
  last_request_at TIMESTAMPTZ;
  duplicate_exists BOOLEAN;
BEGIN
  IF NEW.requested_by != 'candidate' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.applications
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id
      AND status IN ('pending', 'reviewing', 'shortlisted')
  ) THEN
    RAISE EXCEPTION 'You must have an active application for this job to request an interview';
  END IF;

  SELECT COUNT(*) INTO existing_count
  FROM public.interviews
  WHERE candidate_id = NEW.candidate_id
    AND job_id = NEW.job_id
    AND requested_by = 'candidate'
    AND status NOT IN ('cancelled', 'rejected');

  IF existing_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 interview requests per job reached';
  END IF;

  SELECT MAX(created_at) INTO last_request_at
  FROM public.interviews
  WHERE candidate_id = NEW.candidate_id
    AND job_id = NEW.job_id
    AND requested_by = 'candidate';

  IF last_request_at IS NOT NULL AND last_request_at > NOW() - INTERVAL '48 hours' THEN
    RAISE EXCEPTION 'Please wait 48 hours between interview requests';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.interviews
    WHERE candidate_id = NEW.candidate_id
      AND scheduled_date = NEW.scheduled_date
      AND scheduled_time = NEW.scheduled_time
      AND status NOT IN ('cancelled', 'rejected')
  ) INTO duplicate_exists;

  IF duplicate_exists THEN
    RAISE EXCEPTION 'You already have an interview at this date and time';
  END IF;

  RETURN NEW;
END;
$func$;

CREATE TRIGGER validate_interview_request_trigger
  BEFORE INSERT ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_interview_request();

-- Notification trigger for interview events
CREATE OR REPLACE FUNCTION public.notify_interview_event()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $func$
DECLARE
  candidate_user_id uuid;
  employer_user_id uuid;
  job_title text;
  candidate_name text;
BEGIN
  SELECT p.user_id INTO candidate_user_id
  FROM candidates c JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.candidate_id;

  SELECT p.user_id INTO employer_user_id
  FROM employers e JOIN profiles p ON e.profile_id = p.id
  WHERE e.id = NEW.employer_id;

  SELECT j.title INTO job_title FROM jobs j WHERE j.id = NEW.job_id;

  SELECT p.full_name INTO candidate_name
  FROM candidates c JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.candidate_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.requested_by = 'candidate' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (employer_user_id, 'interview_request', 'Interview Request',
        candidate_name || ' requested an interview for "' || COALESCE(job_title, 'a job') || '"',
        '/employer-dashboard');
    ELSE
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (candidate_user_id, 'interview_scheduled', 'Interview Scheduled',
        'An interview has been scheduled for "' || COALESCE(job_title, 'a job') || '"',
        '/candidate-dashboard');
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (candidate_user_id, 'interview_confirmed', 'Interview Confirmed',
        'Your interview for "' || COALESCE(job_title, 'a job') || '" is confirmed for ' || NEW.scheduled_date || ' at ' || NEW.scheduled_time,
        '/candidate-dashboard');
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (employer_user_id, 'interview_confirmed', 'Interview Confirmed',
        'Interview with ' || candidate_name || ' for "' || COALESCE(job_title, 'a job') || '" is confirmed',
        '/employer-dashboard');
    ELSIF NEW.status = 'rejected' THEN
      IF NEW.requested_by = 'candidate' THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (candidate_user_id, 'interview_rejected', 'Interview Request Declined',
          'Your interview request for "' || COALESCE(job_title, 'a job') || '" was declined',
          '/candidate-dashboard');
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NEW.cancelled_by = 'candidate' THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (employer_user_id, 'interview_cancelled', 'Interview Cancelled',
          candidate_name || ' cancelled the interview for "' || COALESCE(job_title, 'a job') || '"',
          '/employer-dashboard');
      ELSE
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (candidate_user_id, 'interview_cancelled', 'Interview Cancelled',
          'Interview for "' || COALESCE(job_title, 'a job') || '" has been cancelled',
          '/candidate-dashboard');
      END IF;
    ELSIF NEW.status = 'rescheduled' THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (candidate_user_id, 'interview_rescheduled', 'Interview Rescheduled',
        'Interview for "' || COALESCE(job_title, 'a job') || '" has been rescheduled',
        '/candidate-dashboard');
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (employer_user_id, 'interview_rescheduled', 'Interview Rescheduled',
        'Interview with ' || candidate_name || ' has been rescheduled',
        '/employer-dashboard');
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

CREATE TRIGGER notify_interview_event_trigger
  AFTER INSERT OR UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_interview_event();

-- Enable realtime for interviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
