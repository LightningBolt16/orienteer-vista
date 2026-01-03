-- Add country_code, logo_path, and map_type columns to route_maps
ALTER TABLE route_maps 
ADD COLUMN country_code text,
ADD COLUMN logo_path text,
ADD COLUMN map_type text DEFAULT 'forest';

-- Update existing maps with their country codes
UPDATE route_maps SET country_code = 'IT' WHERE name IN ('Matera', 'Rotondella');

-- Create map-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('map-logos', 'map-logos', true);

-- Allow public read access for map logos
CREATE POLICY "Anyone can view map logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'map-logos');

-- Allow admin upload for map logos
CREATE POLICY "Admins can upload map logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'map-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admin update for map logos
CREATE POLICY "Admins can update map logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'map-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admin delete for map logos
CREATE POLICY "Admins can delete map logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'map-logos' AND has_role(auth.uid(), 'admin'::app_role));