
-- Create function to increment job view count
CREATE OR REPLACE FUNCTION public.increment_job_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.jobs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

-- Attach trigger on job_views INSERT
DROP TRIGGER IF EXISTS trg_increment_job_view_count ON public.job_views;
CREATE TRIGGER trg_increment_job_view_count
  AFTER INSERT ON public.job_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_job_view_count();

-- Backfill existing counts
UPDATE public.jobs j SET view_count = sub.cnt
FROM (SELECT job_id, COUNT(*) as cnt FROM public.job_views GROUP BY job_id) sub
WHERE j.id = sub.job_id;
