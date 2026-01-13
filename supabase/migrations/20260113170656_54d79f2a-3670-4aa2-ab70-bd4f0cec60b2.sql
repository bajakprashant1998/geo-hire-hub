
-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('candidate', 'employer');

-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('open', 'closed');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_type user_type NOT NULL,
  full_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  avatar_url TEXT,
  is_visible_on_map BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  job_title TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  portfolio_urls TEXT[] DEFAULT '{}',
  expected_salary TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employers table
CREATE TABLE public.employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  industry TEXT,
  website_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  salary_range TEXT,
  job_type TEXT DEFAULT 'Full-time',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status job_status DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_visible_on_map = true);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Candidates policies
CREATE POLICY "Candidates are viewable by everyone" ON public.candidates
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own candidate profile" ON public.candidates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their own candidate profile" ON public.candidates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
  );

-- Employers policies
CREATE POLICY "Employers are viewable by everyone" ON public.employers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own employer profile" ON public.employers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their own employer profile" ON public.employers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND user_id = auth.uid())
  );

-- Jobs policies
CREATE POLICY "Open jobs are viewable by everyone" ON public.jobs
  FOR SELECT USING (status = 'open');

CREATE POLICY "Employers can insert their own jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE e.id = employer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can update their own jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE e.id = employer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can delete their own jobs" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.employers e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE e.id = employer_id AND p.user_id = auth.uid()
    )
  );

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get nearby jobs using Haversine formula
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  employer_id UUID,
  title TEXT,
  description TEXT,
  salary_range TEXT,
  job_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status job_status,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_km DOUBLE PRECISION,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.employer_id,
    j.title,
    j.description,
    j.salary_range,
    j.job_type,
    j.latitude,
    j.longitude,
    j.status,
    j.created_at,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(j.latitude))
    )) AS distance_km,
    e.company_name
  FROM public.jobs j
  JOIN public.employers e ON j.employer_id = e.id
  WHERE j.status = 'open'
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(j.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$$;

-- Create function to get nearby candidates using Haversine formula
CREATE OR REPLACE FUNCTION public.get_nearby_candidates(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  full_name TEXT,
  job_title TEXT,
  experience_years INTEGER,
  skills TEXT[],
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  avatar_url TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.profile_id,
    p.full_name,
    c.job_title,
    c.experience_years,
    c.skills,
    p.latitude,
    p.longitude,
    p.avatar_url,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) AS distance_km
  FROM public.candidates c
  JOIN public.profiles p ON c.profile_id = p.id
  WHERE p.is_visible_on_map = true
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) <= radius_km
  ORDER BY distance_km;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employers_updated_at
  BEFORE UPDATE ON public.employers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'candidate'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
