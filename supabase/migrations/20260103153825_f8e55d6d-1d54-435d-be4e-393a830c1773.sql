-- Create duel rooms table for online multiplayer
CREATE TABLE public.duel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  guest_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  settings JSONB NOT NULL DEFAULT '{}',
  routes JSONB, -- Array of route data for the game
  current_route_index INTEGER DEFAULT 0,
  host_score NUMERIC DEFAULT 0,
  guest_score NUMERIC DEFAULT 0,
  host_ready BOOLEAN DEFAULT false,
  guest_ready BOOLEAN DEFAULT false,
  game_started_at TIMESTAMP WITH TIME ZONE,
  game_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create duel answers table for tracking individual answers
CREATE TABLE public.duel_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.duel_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  route_index INTEGER NOT NULL,
  answer VARCHAR(10) NOT NULL, -- 'left' or 'right'
  answer_time_ms INTEGER, -- Time taken to answer in milliseconds
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick room code lookup
CREATE INDEX idx_duel_rooms_code ON public.duel_rooms(room_code);
CREATE INDEX idx_duel_rooms_status ON public.duel_rooms(status);
CREATE INDEX idx_duel_answers_room ON public.duel_answers(room_id, route_index);

-- Enable RLS
ALTER TABLE public.duel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for duel_rooms - anyone can view rooms they're part of or that are waiting
CREATE POLICY "Users can view rooms they participate in or waiting rooms"
ON public.duel_rooms
FOR SELECT
USING (
  host_id = auth.uid() 
  OR guest_id = auth.uid() 
  OR (status = 'waiting' AND guest_id IS NULL)
);

CREATE POLICY "Authenticated users can create rooms"
ON public.duel_rooms
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Participants can update their room"
ON public.duel_rooms
FOR UPDATE
USING (host_id = auth.uid() OR guest_id = auth.uid());

CREATE POLICY "Host can delete their room"
ON public.duel_rooms
FOR DELETE
USING (host_id = auth.uid());

-- RLS policies for duel_answers
CREATE POLICY "Participants can view answers in their room"
ON public.duel_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.duel_rooms 
    WHERE id = room_id 
    AND (host_id = auth.uid() OR guest_id = auth.uid())
  )
);

CREATE POLICY "Participants can insert their answers"
ON public.duel_answers
FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM public.duel_rooms 
    WHERE id = room_id 
    AND (host_id = auth.uid() OR guest_id = auth.uid())
  )
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_answers;

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to clean up old rooms (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_duel_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM public.duel_rooms 
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_duel_rooms_updated_at
BEFORE UPDATE ON public.duel_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();