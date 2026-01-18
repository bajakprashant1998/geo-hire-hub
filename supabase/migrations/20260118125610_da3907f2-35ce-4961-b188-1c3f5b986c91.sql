-- Drop the overly permissive ALL policy on candidate_resumes
DROP POLICY IF EXISTS "Candidates can manage their resumes" ON public.candidate_resumes;

-- Candidates can view their own resumes
CREATE POLICY "Candidates can view their own resumes"
  ON public.candidate_resumes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM candidates c
      JOIN profiles p ON c.profile_id = p.id
      WHERE c.id = candidate_resumes.candidate_id AND p.user_id = auth.uid()
    )
  );

-- Candidates can insert their own resumes
CREATE POLICY "Candidates can insert their own resumes"
  ON public.candidate_resumes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidates c
      JOIN profiles p ON c.profile_id = p.id
      WHERE c.id = candidate_resumes.candidate_id AND p.user_id = auth.uid()
    )
  );

-- Candidates can update their own resumes
CREATE POLICY "Candidates can update their own resumes"
  ON public.candidate_resumes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM candidates c
      JOIN profiles p ON c.profile_id = p.id
      WHERE c.id = candidate_resumes.candidate_id AND p.user_id = auth.uid()
    )
  );

-- Candidates can delete their own resumes
CREATE POLICY "Candidates can delete their own resumes"
  ON public.candidate_resumes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM candidates c
      JOIN profiles p ON c.profile_id = p.id
      WHERE c.id = candidate_resumes.candidate_id AND p.user_id = auth.uid()
    )
  );

-- Employers can only view resumes of candidates who applied to their jobs
CREATE POLICY "Employers can view resumes of applicants"
  ON public.candidate_resumes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN profiles p ON e.profile_id = p.id
      WHERE a.candidate_id = candidate_resumes.candidate_id 
        AND p.user_id = auth.uid()
    )
  );

-- Admins can view all resumes
CREATE POLICY "Admins can view all resumes"
  ON public.candidate_resumes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));