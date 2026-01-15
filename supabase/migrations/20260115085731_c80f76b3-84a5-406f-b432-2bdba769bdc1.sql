-- Only add the upload policy (the view policy already exists)
CREATE POLICY "Users can upload their own map logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'map-logos');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own map logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'map-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own map logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'map-logos' AND auth.uid()::text = (storage.foldername(name))[1]);