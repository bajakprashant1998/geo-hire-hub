-- Fix overly permissive RLS policy for job_matches table
-- Drop the service role policy and create proper restrictive policies

DROP POLICY IF EXISTS "Service role can manage matches" ON public.job_matches;

-- No need for INSERT/UPDATE/DELETE policies for regular users
-- The edge function will use service role key to manage matches
-- This is handled at the application level, not RLS level