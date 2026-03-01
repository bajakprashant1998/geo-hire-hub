
-- Fix 1: Drop SECURITY DEFINER view and recreate as regular view with security_invoker
DROP VIEW IF EXISTS public.employer_ratings;
CREATE VIEW public.employer_ratings WITH (security_invoker = on) AS
SELECT
  employer_id,
  COUNT(*) AS review_count,
  ROUND(AVG(overall_rating)::numeric, 1) AS avg_overall,
  ROUND(AVG(culture_rating)::numeric, 1) AS avg_culture,
  ROUND(AVG(salary_rating)::numeric, 1) AS avg_salary,
  ROUND(AVG(growth_rating)::numeric, 1) AS avg_growth,
  ROUND(AVG(worklife_rating)::numeric, 1) AS avg_worklife,
  ROUND(AVG(management_rating)::numeric, 1) AS avg_management
FROM public.company_reviews
WHERE is_approved = true
GROUP BY employer_id;

-- Fix 2: Replace overly permissive assessment_questions SELECT policy
DROP POLICY IF EXISTS "Viewable with assessment" ON public.assessment_questions;
CREATE POLICY "Candidates view questions for assessments they take"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (SELECT id FROM skill_assessments WHERE employer_id = public.get_current_user_employer_id())
    OR assessment_id IN (SELECT assessment_id FROM assessment_results WHERE candidate_id = public.get_current_user_candidate_id())
    OR assessment_id IN (SELECT assessment_id FROM jobs j JOIN applications a ON a.job_id = j.id WHERE a.candidate_id = public.get_current_user_candidate_id() AND j.assessment_id IS NOT NULL)
  );
