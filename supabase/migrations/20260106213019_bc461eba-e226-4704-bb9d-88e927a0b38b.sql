-- First drop the existing constraint
ALTER TABLE route_images DROP CONSTRAINT IF EXISTS route_images_aspect_ratio_check;

-- Update existing route_images records to use underscore format
UPDATE route_images SET aspect_ratio = '16_9' WHERE aspect_ratio = '16:9';
UPDATE route_images SET aspect_ratio = '9_16' WHERE aspect_ratio = '9:16';

-- Add new constraint accepting underscore format
ALTER TABLE route_images ADD CONSTRAINT route_images_aspect_ratio_check 
  CHECK (aspect_ratio IN ('16_9', '9_16'));