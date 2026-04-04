
UPDATE public.route_maps rm
SET 
  color_r2_key = um.r2_color_key,
  bw_r2_key = um.r2_bw_key
FROM public.user_maps um
WHERE rm.source_map_id = um.id
  AND rm.color_r2_key IS NULL
  AND um.r2_color_key IS NOT NULL;
