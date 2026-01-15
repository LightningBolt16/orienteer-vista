-- Add a category column to distinguish map types
ALTER TABLE route_maps ADD COLUMN IF NOT EXISTS map_category TEXT DEFAULT 'official';

-- Update existing official maps (public maps without a user_id)
UPDATE route_maps SET map_category = 'official' WHERE user_id IS NULL AND is_public = true;

-- Update existing private user maps
UPDATE route_maps SET map_category = 'private' WHERE user_id IS NOT NULL AND is_public = false;

-- Update user maps that are public to be community maps
UPDATE route_maps SET map_category = 'community' WHERE user_id IS NOT NULL AND is_public = true;