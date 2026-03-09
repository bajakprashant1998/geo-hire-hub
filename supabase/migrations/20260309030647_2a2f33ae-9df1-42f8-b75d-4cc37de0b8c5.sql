
-- Candidate-to-Candidate Connections
CREATE TABLE public.candidate_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE public.candidate_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.candidate_connections FOR SELECT TO authenticated
  USING (
    requester_id = public.get_current_user_candidate_id()
    OR receiver_id = public.get_current_user_candidate_id()
  );

CREATE POLICY "Candidates can send connection requests"
  ON public.candidate_connections FOR INSERT TO authenticated
  WITH CHECK (requester_id = public.get_current_user_candidate_id());

CREATE POLICY "Receiver can update connection status"
  ON public.candidate_connections FOR UPDATE TO authenticated
  USING (receiver_id = public.get_current_user_candidate_id());

CREATE POLICY "Users can delete their own connections"
  ON public.candidate_connections FOR DELETE TO authenticated
  USING (
    requester_id = public.get_current_user_candidate_id()
    OR receiver_id = public.get_current_user_candidate_id()
  );

CREATE INDEX idx_candidate_connections_requester ON public.candidate_connections(requester_id);
CREATE INDEX idx_candidate_connections_receiver ON public.candidate_connections(receiver_id);

-- Cover Letter Templates
CREATE TABLE public.cover_letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cover_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can manage own templates"
  ON public.cover_letter_templates FOR ALL TO authenticated
  USING (candidate_id = public.get_current_user_candidate_id())
  WITH CHECK (candidate_id = public.get_current_user_candidate_id());

CREATE INDEX idx_cover_letter_templates_candidate ON public.cover_letter_templates(candidate_id);
