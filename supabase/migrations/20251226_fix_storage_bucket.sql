-- Fix Storage Bucket RLS Policies for directors-palette
-- Date: 2025-12-26
-- Issue: Images were not displaying in Recipe Editor because RLS was enabled but no policies existed

-- The bucket already exists and is public, but we need RLS policies to allow access

-- Allow public to read all files in directors-palette bucket
CREATE POLICY "Public can view all files in directors-palette"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'directors-palette');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to directors-palette"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'directors-palette');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'directors-palette' AND owner = auth.uid());

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'directors-palette' AND owner = auth.uid());
