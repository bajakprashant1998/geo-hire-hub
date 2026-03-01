
-- Add WhatsApp/SMS notification preference columns
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false;
