-- Fix #1: PUBLIC_DATA_EXPOSURE - Restrict candidate data access
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Candidates are viewable by everyone" ON public.candidates;

-- Add policy: Employers can view all candidates (for hiring purposes)
CREATE POLICY "Employers can view candidates" ON public.candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Add policy: Candidates can view their own profile
CREATE POLICY "Candidates can view their own profile" ON public.candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = candidates.profile_id AND p.user_id = auth.uid()
    )
  );

-- Fix #2: INPUT_VALIDATION - Add server-side message validation
-- Add constraint for message content length (1 to 10000 characters)
ALTER TABLE public.messages 
ADD CONSTRAINT message_content_length 
CHECK (length(content) > 0 AND length(content) <= 10000);

-- Create validation trigger function for messages
CREATE OR REPLACE FUNCTION public.validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace
  NEW.content := TRIM(NEW.content);
  
  -- Validate non-empty after trim
  IF LENGTH(NEW.content) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  
  -- Strip dangerous script tags (basic XSS prevention)
  NEW.content := REGEXP_REPLACE(NEW.content, '<script[^>]*>.*?</script>', '', 'gi');
  NEW.content := REGEXP_REPLACE(NEW.content, '<script[^>]*>', '', 'gi');
  NEW.content := REGEXP_REPLACE(NEW.content, '</script>', '', 'gi');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to validate messages before insert/update
CREATE TRIGGER validate_message_before_insert
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_content();