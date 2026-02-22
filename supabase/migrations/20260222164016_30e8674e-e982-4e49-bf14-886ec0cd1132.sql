-- Update route_finder_challenges SELECT policy to also allow club members
DROP POLICY IF EXISTS "Anyone can view challenges for public maps" ON public.route_finder_challenges;

CREATE POLICY "Anyone can view challenges for accessible maps"
ON public.route_finder_challenges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM route_finder_maps m
    WHERE m.id = route_finder_challenges.map_id
    AND (
      m.is_public = true
      OR m.user_id = auth.uid()
      OR (m.club_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM club_members
        WHERE club_members.club_id = m.club_id
        AND club_members.user_id = auth.uid()
      ))
    )
  )
);