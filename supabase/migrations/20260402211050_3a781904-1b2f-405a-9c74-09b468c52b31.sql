
ALTER TABLE public.route_maps ADD COLUMN IF NOT EXISTS impassability_image_url text;
ALTER TABLE public.user_maps ADD COLUMN IF NOT EXISTS source_public_map_id uuid;
