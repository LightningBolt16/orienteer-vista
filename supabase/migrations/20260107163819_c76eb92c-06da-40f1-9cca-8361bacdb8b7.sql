-- Add columns to track if files are split into tiles
ALTER TABLE user_maps 
ADD COLUMN is_tiled BOOLEAN DEFAULT false,
ADD COLUMN tile_grid JSONB DEFAULT NULL;

-- tile_grid stores: {"rows": 5, "cols": 2, "tileWidth": X, "tileHeight": Y, "originalWidth": W, "originalHeight": H}