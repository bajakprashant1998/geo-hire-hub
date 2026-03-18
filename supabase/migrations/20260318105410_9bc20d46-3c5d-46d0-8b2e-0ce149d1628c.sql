
DROP POLICY IF EXISTS "Approved employers can view resumes" ON storage.objects;

CREATE POLICY "Employers can view resumes based on visibility settings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND (
    -- Candidate can view own resume
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Admins can view all resumes
    public.has_role(auth.uid(), 'admin')
    OR
    -- Employers can view based on candidate's resume_visibility setting
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.profiles p ON c.profile_id = p.id
      WHERE p.user_id::text = (storage.foldername(name))[1]
      AND (
        -- Visible to all approved employers
        (
          c.resume_visibility = 'approved_employers'
          AND EXISTS (
            SELECT 1 FROM public.employers e
            JOIN public.profiles ep ON e.profile_id = ep.id
            WHERE ep.user_id = auth.uid()
            AND e.verification_status = 'approved'
          )
        )
        OR
        -- Only visible to employers where candidate applied
        (
          c.resume_visibility = 'only_applied'
          AND EXISTS (
            SELECT 1 FROM public.applications app
            JOIN public.jobs j ON app.job_id = j.id
            JOIN public.employers e ON j.employer_id = e.id
            JOIN public.profiles ep ON e.profile_id = ep.id
            WHERE app.candidate_id = c.id
            AND ep.user_id = auth.uid()
          )
        )
      )
    )
  )
);
