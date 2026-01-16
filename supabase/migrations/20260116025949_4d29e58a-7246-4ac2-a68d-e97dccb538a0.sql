-- Create table to track job category popularity
CREATE TABLE public.job_category_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  selection_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_name)
);

-- Enable RLS
ALTER TABLE public.job_category_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read category stats (public data)
CREATE POLICY "Anyone can view category stats"
ON public.job_category_stats
FOR SELECT
USING (true);

-- Authenticated users can insert/update stats
CREATE POLICY "Authenticated users can insert category stats"
ON public.job_category_stats
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update category stats"
ON public.job_category_stats
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create index for fast lookups
CREATE INDEX idx_category_stats_selection ON public.job_category_stats(selection_count DESC);
CREATE INDEX idx_category_stats_name ON public.job_category_stats(category_name);

-- Function to increment category usage (upsert pattern)
CREATE OR REPLACE FUNCTION public.track_category_usage(
  p_category_name TEXT,
  p_is_selection BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.job_category_stats (category_name, search_count, selection_count, last_used_at)
  VALUES (
    LOWER(TRIM(p_category_name)),
    CASE WHEN p_is_selection THEN 0 ELSE 1 END,
    CASE WHEN p_is_selection THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (category_name)
  DO UPDATE SET
    search_count = job_category_stats.search_count + CASE WHEN p_is_selection THEN 0 ELSE 1 END,
    selection_count = job_category_stats.selection_count + CASE WHEN p_is_selection THEN 1 ELSE 0 END,
    last_used_at = now();
END;
$$;

-- Function to get popular categories
CREATE OR REPLACE FUNCTION public.get_popular_categories(p_limit INTEGER DEFAULT 20)
RETURNS TABLE(category_name TEXT, popularity_score INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jcs.category_name,
    (jcs.selection_count * 3 + jcs.search_count) AS popularity_score
  FROM public.job_category_stats jcs
  WHERE jcs.selection_count > 0 OR jcs.search_count > 0
  ORDER BY popularity_score DESC, jcs.last_used_at DESC
  LIMIT p_limit;
END;
$$;