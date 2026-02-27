-- Enable realtime for jobs table to support live markers
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;