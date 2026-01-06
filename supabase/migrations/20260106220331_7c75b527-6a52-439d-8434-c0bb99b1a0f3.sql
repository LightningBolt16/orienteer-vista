-- Make user-route-images bucket public so route images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'user-route-images';