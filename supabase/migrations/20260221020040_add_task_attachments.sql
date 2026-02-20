-- Add file attachment support to the tasks table
ALTER TABLE tasks
ADD COLUMN file_url text,
ADD COLUMN file_name text;
