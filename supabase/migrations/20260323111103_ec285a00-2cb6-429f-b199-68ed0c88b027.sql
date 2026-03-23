ALTER TABLE public.route_finder_challenges
DROP CONSTRAINT IF EXISTS route_finder_challenges_aspect_ratio_check;

ALTER TABLE public.route_finder_challenges
ADD CONSTRAINT route_finder_challenges_aspect_ratio_check
CHECK (aspect_ratio = ANY (ARRAY['16_9'::text, '9_16'::text, '1_1'::text, '1:1'::text]));