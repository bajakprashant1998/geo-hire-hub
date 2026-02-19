
-- Email templates table for admin-managed email customization
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_body text NOT NULL,
  description text,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Site content table for CMS-like admin controls
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key text NOT NULL UNIQUE,
  content_type text NOT NULL DEFAULT 'text',
  title text,
  body text,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active site content"
  ON public.site_content FOR SELECT
  USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default email templates
INSERT INTO public.email_templates (template_key, subject, html_body, description, variables) VALUES
('welcome', 'Welcome to HireForJob!', '<h1>Welcome {{name}}!</h1><p>Thank you for joining our platform. Get started by completing your profile.</p>', 'Sent to new users after registration', ARRAY['name', 'email']),
('password_reset', 'Reset Your Password', '<h1>Password Reset</h1><p>Hi {{name}}, click the link below to reset your password:</p><a href="{{reset_link}}">Reset Password</a>', 'Sent when user requests password reset', ARRAY['name', 'reset_link']),
('application_received', 'New Application Received', '<h1>New Application</h1><p>Hi {{employer_name}}, you received a new application from {{candidate_name}} for {{job_title}}.</p>', 'Sent to employer when candidate applies', ARRAY['employer_name', 'candidate_name', 'job_title']),
('application_status', 'Application Status Update', '<h1>Status Update</h1><p>Hi {{candidate_name}}, your application for {{job_title}} has been updated to: {{status}}.</p>', 'Sent to candidate on status change', ARRAY['candidate_name', 'job_title', 'status']),
('interview_scheduled', 'Interview Scheduled', '<h1>Interview Scheduled</h1><p>Hi {{candidate_name}}, your interview for {{job_title}} is scheduled on {{date}} at {{time}}.</p>', 'Sent when interview is scheduled', ARRAY['candidate_name', 'job_title', 'date', 'time']);

-- Seed default site content
INSERT INTO public.site_content (content_key, content_type, title, body, metadata) VALUES
('homepage_banner', 'banner', 'Find Your Dream Job', 'Discover thousands of job opportunities near you on the map', '{"bg_color": "primary", "text_color": "primary-foreground", "cta_text": "Get Started", "cta_link": "/signup"}'),
('announcement_bar', 'announcement', '', '', '{"type": "info", "dismissible": true}'),
('meta_homepage', 'seo', 'HireForJob - Find Jobs Near You', 'Find jobs, post positions, and connect with employers on the world''s location-based job platform.', '{"keywords": "jobs, hiring, career, employment, map", "og_image": "/logo.png"}'),
('featured_jobs_config', 'config', 'Featured Jobs', '', '{"enabled": false, "max_featured": 5, "featured_job_ids": []}');
