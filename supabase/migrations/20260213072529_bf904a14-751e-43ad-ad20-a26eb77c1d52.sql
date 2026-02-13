
-- Create tasks table for employer-to-candidate task assignment
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  completed_at timestamptz,
  candidate_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Employer can manage their own tasks
CREATE POLICY "Employers can view their own tasks"
ON public.tasks FOR SELECT TO authenticated
USING (employer_id = (SELECT id FROM public.employers WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Employers can create tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (employer_id = (SELECT id FROM public.employers WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Employers can update their own tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (employer_id = (SELECT id FROM public.employers WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Employers can delete their own tasks"
ON public.tasks FOR DELETE TO authenticated
USING (employer_id = (SELECT id FROM public.employers WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Candidates can view tasks assigned to them
CREATE POLICY "Candidates can view assigned tasks"
ON public.tasks FOR SELECT TO authenticated
USING (candidate_id = (SELECT id FROM public.candidates WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Candidates can update status and notes on assigned tasks
CREATE POLICY "Candidates can update assigned tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (candidate_id = (SELECT id FROM public.candidates WHERE profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
