
-- Route Navigator Maps
CREATE TABLE public.route_navigator_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid,
  source_image_url text,
  image_width integer,
  image_height integer,
  map_category text DEFAULT 'official',
  is_public boolean DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  country_code text,
  club_id uuid REFERENCES public.clubs(id),
  source_map_id uuid REFERENCES public.user_maps(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_navigator_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all route navigator maps" ON public.route_navigator_maps FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view public route navigator maps" ON public.route_navigator_maps FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own route navigator maps" ON public.route_navigator_maps FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own route navigator maps" ON public.route_navigator_maps FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own route navigator maps" ON public.route_navigator_maps FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Club members can view club route navigator maps" ON public.route_navigator_maps FOR SELECT USING (club_id IS NOT NULL AND EXISTS (SELECT 1 FROM club_members WHERE club_members.club_id = route_navigator_maps.club_id AND club_members.user_id = auth.uid()));

-- Route Navigator Challenges
CREATE TABLE public.route_navigator_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid NOT NULL REFERENCES public.route_navigator_maps(id) ON DELETE CASCADE,
  challenge_index integer NOT NULL,
  start_x numeric NOT NULL,
  start_y numeric NOT NULL,
  finish_x numeric NOT NULL,
  finish_y numeric NOT NULL,
  bbox jsonb,
  decision_points jsonb NOT NULL,
  optimal_length numeric,
  difficulty_score numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.route_navigator_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all navigator challenges" ON public.route_navigator_challenges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view challenges for accessible maps" ON public.route_navigator_challenges FOR SELECT USING (EXISTS (SELECT 1 FROM route_navigator_maps m WHERE m.id = route_navigator_challenges.map_id AND (m.is_public = true OR m.user_id = auth.uid() OR (m.club_id IS NOT NULL AND EXISTS (SELECT 1 FROM club_members WHERE club_members.club_id = m.club_id AND club_members.user_id = auth.uid())))));
CREATE POLICY "Users can delete challenges for own maps" ON public.route_navigator_challenges FOR DELETE USING (EXISTS (SELECT 1 FROM route_navigator_maps WHERE route_navigator_maps.id = route_navigator_challenges.map_id AND route_navigator_maps.user_id = auth.uid()));

-- Route Navigator Attempts
CREATE TABLE public.route_navigator_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES public.route_navigator_challenges(id),
  map_name text NOT NULL,
  player_path jsonb,
  is_optimal boolean DEFAULT false,
  wrong_turns integer DEFAULT 0,
  response_time integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.route_navigator_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attempts for leaderboard" ON public.route_navigator_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own attempts" ON public.route_navigator_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
