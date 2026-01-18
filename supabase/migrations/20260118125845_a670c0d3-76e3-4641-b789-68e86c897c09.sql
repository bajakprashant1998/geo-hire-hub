-- Create a public view that excludes sensitive timestamps
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  user_type,
  full_name,
  latitude,
  longitude,
  avatar_url,
  is_visible_on_map,
  profile_completed,
  created_at,
  updated_at
  -- Excludes: last_login_at, two_factor_enabled
FROM public.profiles;