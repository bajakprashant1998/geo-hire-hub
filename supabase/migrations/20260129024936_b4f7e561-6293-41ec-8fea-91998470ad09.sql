-- Add audio resume fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS audio_resume_url TEXT,
ADD COLUMN IF NOT EXISTS audio_resume_tone TEXT,
ADD COLUMN IF NOT EXISTS audio_resume_text TEXT,
ADD COLUMN IF NOT EXISTS audio_resume_created_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for audio resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-resumes', 'audio-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own audio resumes
CREATE POLICY "Users can upload their own audio resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to audio resumes
CREATE POLICY "Audio resumes are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-resumes');

-- Allow users to update their own audio resume
CREATE POLICY "Users can update their own audio resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio-resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own audio resume
CREATE POLICY "Users can delete their own audio resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);