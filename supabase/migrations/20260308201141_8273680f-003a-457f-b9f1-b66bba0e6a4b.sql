
-- Team member roles enum
CREATE TYPE public.team_role AS ENUM ('owner', 'hiring_manager', 'recruiter', 'interviewer', 'viewer');

-- Team members table
CREATE TABLE public.employer_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_role team_role NOT NULL DEFAULT 'viewer',
  invited_email TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"can_post_jobs": false, "can_manage_candidates": false, "can_schedule_interviews": false, "can_approve_offers": false, "can_manage_team": false}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employer_id, profile_id)
);

ALTER TABLE public.employer_team_members ENABLE ROW LEVEL SECURITY;

-- Team tasks (hiring task board)
CREATE TABLE public.team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

-- Approval workflows
CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_type TEXT NOT NULL DEFAULT 'job_posting',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- Approval requests
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Team members - employer owner/team can manage
CREATE POLICY "Employer team members access"
  ON public.employer_team_members FOR ALL
  TO authenticated
  USING (employer_id = public.get_current_user_employer_id())
  WITH CHECK (employer_id = public.get_current_user_employer_id());

-- RLS: Team tasks
CREATE POLICY "Team tasks employer access"
  ON public.team_tasks FOR ALL
  TO authenticated
  USING (employer_id = public.get_current_user_employer_id())
  WITH CHECK (employer_id = public.get_current_user_employer_id());

-- RLS: Approval workflows
CREATE POLICY "Approval workflows employer access"
  ON public.approval_workflows FOR ALL
  TO authenticated
  USING (employer_id = public.get_current_user_employer_id())
  WITH CHECK (employer_id = public.get_current_user_employer_id());

-- RLS: Approval requests
CREATE POLICY "Approval requests employer access"
  ON public.approval_requests FOR ALL
  TO authenticated
  USING (employer_id = public.get_current_user_employer_id())
  WITH CHECK (employer_id = public.get_current_user_employer_id());

-- Triggers
CREATE TRIGGER update_employer_team_members_updated_at
  BEFORE UPDATE ON public.employer_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_tasks_updated_at
  BEFORE UPDATE ON public.team_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
