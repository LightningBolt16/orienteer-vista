-- Remove the unique constraint on route_maps.name to allow duplicate names
ALTER TABLE public.route_maps DROP CONSTRAINT IF EXISTS route_maps_name_key;