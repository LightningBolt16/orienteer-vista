
-- Increase route-images bucket file size limit to 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE id = 'route-images';

-- Ensure admins can upload to route-images bucket
CREATE POLICY "Admins can upload to route-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'route-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Ensure admins can update files in route-images bucket
CREATE POLICY "Admins can update route-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'route-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
