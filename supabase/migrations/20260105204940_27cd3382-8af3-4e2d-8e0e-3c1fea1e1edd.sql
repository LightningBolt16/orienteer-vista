-- Increase file size limit for user-map-sources bucket to 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE id = 'user-map-sources';

-- Also update user-route-images bucket to 100MB for processed images
UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE id = 'user-route-images';