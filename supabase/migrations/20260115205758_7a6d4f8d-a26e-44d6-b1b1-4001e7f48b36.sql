-- Drop the old constraint
ALTER TABLE public.route_images 
DROP CONSTRAINT IF EXISTS route_images_shortest_side_check;

-- Add new constraint with all valid values
ALTER TABLE public.route_images 
ADD CONSTRAINT route_images_shortest_side_check 
CHECK (shortest_side = ANY (ARRAY[
  'left', 'right', 
  'center-left', 'center-right',
  'top-left', 'top-right',
  'bottom-left', 'bottom-right',
  'center'
]));