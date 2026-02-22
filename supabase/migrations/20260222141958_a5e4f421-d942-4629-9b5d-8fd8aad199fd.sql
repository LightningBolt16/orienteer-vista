
-- Add club_id to route_finder_maps
ALTER TABLE public.route_finder_maps ADD COLUMN club_id uuid REFERENCES public.clubs(id);

-- Add club_id to route_maps
ALTER TABLE public.route_maps ADD COLUMN club_id uuid REFERENCES public.clubs(id);

-- RLS: Club members can view club route_finder_maps
CREATE POLICY "Club members can view club route finder maps"
ON public.route_finder_maps
FOR SELECT
USING (
  club_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = route_finder_maps.club_id
    AND club_members.user_id = auth.uid()
  )
);

-- RLS: Club members can view club route_maps
CREATE POLICY "Club members can view club route maps"
ON public.route_maps
FOR SELECT
USING (
  club_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = route_maps.club_id
    AND club_members.user_id = auth.uid()
  )
);

-- RLS: Users can update their own route_finder_maps (to publish to club)
CREATE POLICY "Users can update own route finder maps"
ON public.route_finder_maps
FOR UPDATE
USING (user_id = auth.uid());
