-- Add safe_zone column to route_images for 1:1 adaptive cropping
-- Format: {"x": 0.15, "y": 0.20, "w": 0.70, "h": 0.60} (normalized 0-1 coordinates)
ALTER TABLE public.route_images ADD COLUMN safe_zone jsonb DEFAULT NULL;