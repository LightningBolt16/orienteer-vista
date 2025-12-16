-- Add policy to allow admins to create clubs on behalf of users
CREATE POLICY "Admins can create clubs" 
ON public.clubs 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add policy to allow admins to add members to clubs they create
CREATE POLICY "Admins can add members to clubs" 
ON public.club_members 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);