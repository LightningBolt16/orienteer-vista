-- Add columns for impassability mask and exact bbox dimensions
ALTER TABLE route_finder_challenges 
ADD COLUMN IF NOT EXISTS impassability_mask_path TEXT,
ADD COLUMN IF NOT EXISTS bbox_width INTEGER,
ADD COLUMN IF NOT EXISTS bbox_height INTEGER;