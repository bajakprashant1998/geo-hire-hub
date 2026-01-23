-- Add whatsapp_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN whatsapp_number text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.whatsapp_number IS 
  'WhatsApp contact number with country code (e.g., 919876543210)';