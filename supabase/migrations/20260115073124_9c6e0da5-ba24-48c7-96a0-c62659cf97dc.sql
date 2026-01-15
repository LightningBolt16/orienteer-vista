-- Add location columns to route_maps table for community map publishing
ALTER TABLE public.route_maps 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_route_maps_location ON public.route_maps (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Allow users to update their own maps (for publishing to community)
CREATE POLICY "Users can update their own route maps" 
ON public.route_maps 
FOR UPDATE 
USING (user_id = auth.uid());