
-- Add AI moderation columns to moderation_queue
ALTER TABLE public.moderation_queue
ADD COLUMN IF NOT EXISTS ai_risk_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_risk_reasons text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_scanned_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_recommendation text DEFAULT NULL;

-- Create content_moderation_scans table for auto-scanning new content
CREATE TABLE IF NOT EXISTS public.content_moderation_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  content_text text NOT NULL,
  risk_score integer NOT NULL DEFAULT 0,
  risk_reasons text[] DEFAULT '{}',
  recommendation text NOT NULL DEFAULT 'approve',
  flagged boolean NOT NULL DEFAULT false,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_moderation_item_id uuid REFERENCES public.moderation_queue(id) ON DELETE SET NULL
);

ALTER TABLE public.content_moderation_scans ENABLE ROW LEVEL SECURITY;

-- Only admins can view scans
CREATE POLICY "Admins can manage content scans" ON public.content_moderation_scans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
