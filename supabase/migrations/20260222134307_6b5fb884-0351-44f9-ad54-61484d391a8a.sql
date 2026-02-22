
-- Add club_id column to user_maps for club-shared private maps
ALTER TABLE public.user_maps ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

-- RLS policy: club members can view maps shared with their club
CREATE POLICY "Club members can view club maps"
ON public.user_maps
FOR SELECT
USING (
  club_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = user_maps.club_id
      AND club_members.user_id = auth.uid()
  )
);

-- RLS policy: club admins can insert maps with their club_id
CREATE POLICY "Club admins can insert club maps"
ON public.user_maps
FOR INSERT
WITH CHECK (
  club_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = user_maps.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role = 'admin'
  )
);
