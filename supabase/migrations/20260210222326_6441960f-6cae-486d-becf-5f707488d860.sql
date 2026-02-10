
-- Add is_hidden column to route_maps (Route Choice game)
ALTER TABLE public.route_maps ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

-- Add is_hidden column to route_finder_maps (Route Finder game)
ALTER TABLE public.route_finder_maps ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
