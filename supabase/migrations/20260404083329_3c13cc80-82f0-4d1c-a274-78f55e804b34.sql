
-- Add R2 source keys to route_maps for storing full-resolution source files
ALTER TABLE public.route_maps ADD COLUMN IF NOT EXISTS color_r2_key text;
ALTER TABLE public.route_maps ADD COLUMN IF NOT EXISTS bw_r2_key text;

-- Backfill from linked user_maps where source_map_id exists
UPDATE public.route_maps rm
SET 
  color_r2_key = um.r2_color_key,
  bw_r2_key = um.r2_bw_key
FROM public.user_maps um
WHERE rm.source_map_id = um.id
  AND um.r2_color_key IS NOT NULL
  AND rm.color_r2_key IS NULL;
