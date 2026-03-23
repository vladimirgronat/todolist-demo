-- 1. Create the task-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for storage objects
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-photos');

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view task photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-photos');
