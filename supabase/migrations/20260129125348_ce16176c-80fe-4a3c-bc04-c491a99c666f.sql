-- Route Finder Gamemode Tables

-- Table: route_finder_maps - Maps available for Route Finder gamemode
CREATE TABLE public.route_finder_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID,
  source_map_id UUID REFERENCES public.user_maps(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  map_category TEXT DEFAULT 'official',
  description TEXT,
  country_code TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: route_finder_challenges - Individual route challenges with graph data
CREATE TABLE public.route_finder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES public.route_finder_maps(id) ON DELETE CASCADE NOT NULL,
  challenge_index INTEGER NOT NULL,
  
  -- Graph data for client-side pathfinding
  graph_data JSONB NOT NULL,
  start_node_id TEXT NOT NULL,
  finish_node_id TEXT NOT NULL,
  optimal_path JSONB NOT NULL,
  optimal_length NUMERIC NOT NULL,
  
  -- Image paths
  base_image_path TEXT NOT NULL,
  answer_image_path TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16_9', '9_16', '1:1')),
  
  -- Metadata
  difficulty_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: route_finder_attempts - User attempts for scoring/leaderboard
CREATE TABLE public.route_finder_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID REFERENCES public.route_finder_challenges(id) ON DELETE CASCADE,
  map_name TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL,
  user_path JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.route_finder_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_finder_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_finder_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_finder_maps
CREATE POLICY "Anyone can view public route finder maps"
  ON public.route_finder_maps FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own route finder maps"
  ON public.route_finder_maps FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all route finder maps"
  ON public.route_finder_maps FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for route_finder_challenges
CREATE POLICY "Anyone can view challenges for public maps"
  ON public.route_finder_challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.route_finder_maps m
      WHERE m.id = route_finder_challenges.map_id
      AND (m.is_public = true OR m.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all challenges"
  ON public.route_finder_challenges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for route_finder_attempts
CREATE POLICY "Users can insert their own attempts"
  ON public.route_finder_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attempts"
  ON public.route_finder_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view attempts for leaderboard"
  ON public.route_finder_attempts FOR SELECT
  USING (true);

-- Updated at trigger for route_finder_maps
CREATE TRIGGER update_route_finder_maps_updated_at
  BEFORE UPDATE ON public.route_finder_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_route_finder_challenges_map_id ON public.route_finder_challenges(map_id);
CREATE INDEX idx_route_finder_attempts_user_id ON public.route_finder_attempts(user_id);
CREATE INDEX idx_route_finder_attempts_challenge_id ON public.route_finder_attempts(challenge_id);