-- Create email verification tokens table
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for fast token lookup
CREATE INDEX idx_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated users (for signup flow)
CREATE POLICY "Users can create their own verification tokens"
  ON public.email_verification_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own tokens
CREATE POLICY "Users can read their own verification tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add custom_email_verified column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_email_verified BOOLEAN DEFAULT false;

-- Create function to verify email token
CREATE OR REPLACE FUNCTION public.verify_email_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_result JSON;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM email_verification_tokens
  WHERE token = p_token
    AND verified_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;
  
  -- Mark token as verified
  UPDATE email_verification_tokens
  SET verified_at = now()
  WHERE id = v_token_record.id;
  
  -- Update profile
  UPDATE profiles
  SET custom_email_verified = true
  WHERE user_id = v_token_record.user_id;
  
  RETURN json_build_object('success', true, 'email', v_token_record.email);
END;
$$;

-- Allow anonymous users to call verify function (for email link clicks)
GRANT EXECUTE ON FUNCTION public.verify_email_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_email_token(TEXT) TO authenticated;