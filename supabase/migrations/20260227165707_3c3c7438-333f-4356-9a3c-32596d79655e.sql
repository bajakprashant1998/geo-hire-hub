
-- Allow admins to delete candidates
CREATE POLICY "Admins can delete any candidate"
ON public.candidates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete employers  
CREATE POLICY "Admins can delete any employer"
ON public.employers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a function to safely delete a candidate and their profile
CREATE OR REPLACE FUNCTION public.admin_delete_candidate(p_candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete candidates';
  END IF;

  -- Get profile and user info
  SELECT c.profile_id, p.user_id INTO v_profile_id, v_user_id
  FROM candidates c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = p_candidate_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  -- Delete related data first
  DELETE FROM auto_apply_preferences WHERE candidate_id = p_candidate_id;
  DELETE FROM auto_apply_logs WHERE candidate_id = p_candidate_id;
  DELETE FROM job_alerts WHERE candidate_id = p_candidate_id;
  DELETE FROM job_matches WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_resumes WHERE candidate_id = p_candidate_id;
  DELETE FROM tasks WHERE candidate_id = p_candidate_id;
  
  -- Delete applications
  DELETE FROM applications WHERE candidate_id = p_candidate_id;
  
  -- Delete interviews
  DELETE FROM interviews WHERE candidate_id = p_candidate_id;
  
  -- Delete the candidate record
  DELETE FROM candidates WHERE id = p_candidate_id;
  
  -- Log the action
  PERFORM public.log_admin_action('delete', 'candidate', p_candidate_id, 
    jsonb_build_object('profile_id', v_profile_id, 'user_id', v_user_id));
END;
$$;

-- Create a function to safely delete an employer and their data
CREATE OR REPLACE FUNCTION public.admin_delete_employer(p_employer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete employers';
  END IF;

  SELECT e.profile_id, p.user_id INTO v_profile_id, v_user_id
  FROM employers e
  JOIN profiles p ON e.profile_id = p.id
  WHERE e.id = p_employer_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Employer not found';
  END IF;

  -- Delete related data
  DELETE FROM employer_subscriptions WHERE employer_id = p_employer_id;
  DELETE FROM employer_reports WHERE employer_id = p_employer_id;
  DELETE FROM job_drafts WHERE employer_id = p_employer_id;
  DELETE FROM tasks WHERE employer_id = p_employer_id;
  
  -- Delete interviews for employer's jobs
  DELETE FROM interviews WHERE employer_id = p_employer_id;
  
  -- Delete applications for employer's jobs
  DELETE FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE employer_id = p_employer_id);
  
  -- Delete jobs
  DELETE FROM jobs WHERE employer_id = p_employer_id;
  
  -- Delete employer record
  DELETE FROM employers WHERE id = p_employer_id;
  
  -- Log the action
  PERFORM public.log_admin_action('delete', 'employer', p_employer_id,
    jsonb_build_object('profile_id', v_profile_id, 'user_id', v_user_id));
END;
$$;
