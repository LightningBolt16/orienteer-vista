-- Add column to store impassable annotations for server-side compositing
ALTER TABLE public.user_maps 
ADD COLUMN IF NOT EXISTS impassable_annotations JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.user_maps.impassable_annotations IS 'Stores impassable areas and lines for server-side compositing. Structure: { areas: [{ points: [{ x, y }] }], lines: [{ start: { x, y }, end: { x, y } }] }';