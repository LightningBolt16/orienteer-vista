-- Add preview status tracking to user_maps
ALTER TABLE public.user_maps 
  ADD COLUMN IF NOT EXISTS preview_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS preview_error text;

-- Add preview status tracking to route_maps  
ALTER TABLE public.route_maps
  ADD COLUMN IF NOT EXISTS preview_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS preview_error text;

-- Backfill: if a map already has BOTH preview URLs, mark as ready
UPDATE public.user_maps 
SET preview_status = 'ready' 
WHERE preview_status = 'pending' 
  AND color_preview_url IS NOT NULL 
  AND bw_preview_url IS NOT NULL;

UPDATE public.user_maps 
SET preview_status = 'partial' 
WHERE preview_status = 'pending' 
  AND color_preview_url IS NOT NULL 
  AND bw_preview_url IS NULL;

UPDATE public.route_maps 
SET preview_status = 'ready' 
WHERE preview_status = 'pending' 
  AND color_image_url IS NOT NULL 
  AND impassability_image_url IS NOT NULL;

UPDATE public.route_maps 
SET preview_status = 'partial' 
WHERE preview_status = 'pending' 
  AND color_image_url IS NOT NULL 
  AND impassability_image_url IS NULL;

-- Mark maps with no source at all as 'unavailable'
UPDATE public.user_maps 
SET preview_status = 'unavailable' 
WHERE preview_status = 'pending'
  AND r2_color_key IS NULL 
  AND color_tif_path IS NULL;

UPDATE public.route_maps
SET preview_status = 'unavailable'
WHERE preview_status = 'pending'
  AND color_r2_key IS NULL
  AND color_image_url IS NULL;