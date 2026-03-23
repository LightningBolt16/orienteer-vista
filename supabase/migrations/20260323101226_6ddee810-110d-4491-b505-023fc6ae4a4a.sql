
-- Allow users to delete their own route_maps
CREATE POLICY "Users can delete their own route maps"
ON public.route_maps
FOR DELETE
TO public
USING (user_id = auth.uid());

-- Allow users to delete their own route_finder_maps
CREATE POLICY "Users can delete their own route finder maps"
ON public.route_finder_maps
FOR DELETE
TO public
USING (user_id = auth.uid());

-- Allow users to delete route_images for their own maps
CREATE POLICY "Users can delete route images for own maps"
ON public.route_images
FOR DELETE
TO public
USING (EXISTS (
  SELECT 1 FROM public.route_maps
  WHERE route_maps.id = route_images.map_id
  AND route_maps.user_id = auth.uid()
));

-- Allow users to delete challenges for their own maps
CREATE POLICY "Users can delete challenges for own maps"
ON public.route_finder_challenges
FOR DELETE
TO public
USING (EXISTS (
  SELECT 1 FROM public.route_finder_maps
  WHERE route_finder_maps.id = route_finder_challenges.map_id
  AND route_finder_maps.user_id = auth.uid()
));
