-- Modify aspect_ratio check constraint to include '1:1'
ALTER TABLE route_images 
DROP CONSTRAINT IF EXISTS route_images_aspect_ratio_check;

ALTER TABLE route_images 
ADD CONSTRAINT route_images_aspect_ratio_check 
CHECK (aspect_ratio IN ('16_9', '9_16', '16:9', '9:16', '1:1'));