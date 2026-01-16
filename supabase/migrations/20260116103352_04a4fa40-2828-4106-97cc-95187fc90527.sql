-- Create community_map_favorites table
CREATE TABLE public.community_map_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route_map_id uuid NOT NULL REFERENCES route_maps(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, route_map_id)
);

-- Enable RLS
ALTER TABLE public.community_map_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites" ON public.community_map_favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can add their own favorites  
CREATE POLICY "Users can add their own favorites" ON public.community_map_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own favorites" ON public.community_map_favorites
  FOR DELETE USING (auth.uid() = user_id);