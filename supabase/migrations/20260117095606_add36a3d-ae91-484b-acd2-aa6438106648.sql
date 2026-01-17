-- First, add columns for 4-player support (must be done before policies reference them)
ALTER TABLE public.duel_rooms
  ADD COLUMN IF NOT EXISTS player_3_id text,
  ADD COLUMN IF NOT EXISTS player_3_name text,
  ADD COLUMN IF NOT EXISTS player_3_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player_3_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS player_4_id text,
  ADD COLUMN IF NOT EXISTS player_4_name text,
  ADD COLUMN IF NOT EXISTS player_4_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player_4_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS current_player_count integer DEFAULT 1;

-- Fix the RLS UPDATE policy to allow guests to join waiting rooms
DROP POLICY IF EXISTS "Participants can update their room" ON public.duel_rooms;

CREATE POLICY "Participants can update their room" ON public.duel_rooms
  FOR UPDATE
  USING (
    (host_id = (auth.uid())::text) 
    OR (guest_id = (auth.uid())::text) 
    OR (player_3_id = (auth.uid())::text)
    OR (player_4_id = (auth.uid())::text)
    OR (host_id ~~ 'guest_%'::text) 
    OR (guest_id ~~ 'guest_%'::text)
    OR (player_3_id ~~ 'guest_%'::text)
    OR (player_4_id ~~ 'guest_%'::text)
    -- Allow anyone to join a waiting room with available slots
    OR ((status)::text = 'waiting' AND current_player_count < max_players)
  );

-- Update RLS policies to include player_3 and player_4 in participant checks
DROP POLICY IF EXISTS "Users can view rooms they participate in or waiting rooms" ON public.duel_rooms;

CREATE POLICY "Users can view rooms they participate in or waiting rooms" ON public.duel_rooms
  FOR SELECT
  USING (
    (host_id = (auth.uid())::text) 
    OR (guest_id = (auth.uid())::text) 
    OR (player_3_id = (auth.uid())::text)
    OR (player_4_id = (auth.uid())::text)
    OR (((status)::text = 'waiting'::text) AND (current_player_count < max_players))
    OR (host_id ~~ 'guest_%'::text) 
    OR (guest_id ~~ 'guest_%'::text)
    OR (player_3_id ~~ 'guest_%'::text)
    OR (player_4_id ~~ 'guest_%'::text)
  );

-- Update DELETE policy to include all participants
DROP POLICY IF EXISTS "Host can delete their room" ON public.duel_rooms;

CREATE POLICY "Host can delete their room" ON public.duel_rooms
  FOR DELETE
  USING (
    (host_id = (auth.uid())::text) 
    OR (host_id ~~ 'guest_%'::text)
  );

-- Update duel_answers RLS policies to include player_3 and player_4
DROP POLICY IF EXISTS "Participants can insert their answers" ON public.duel_answers;

CREATE POLICY "Participants can insert their answers" ON public.duel_answers
  FOR INSERT
  WITH CHECK (
    ((player_id = (auth.uid())::text) OR (player_id ~~ 'guest_%'::text)) 
    AND (EXISTS (
      SELECT 1 FROM duel_rooms
      WHERE (duel_rooms.id = duel_answers.room_id) 
      AND (
        (duel_rooms.host_id = (auth.uid())::text) 
        OR (duel_rooms.guest_id = (auth.uid())::text) 
        OR (duel_rooms.player_3_id = (auth.uid())::text)
        OR (duel_rooms.player_4_id = (auth.uid())::text)
        OR (duel_rooms.host_id ~~ 'guest_%'::text) 
        OR (duel_rooms.guest_id ~~ 'guest_%'::text)
        OR (duel_rooms.player_3_id ~~ 'guest_%'::text)
        OR (duel_rooms.player_4_id ~~ 'guest_%'::text)
      )
    ))
  );

DROP POLICY IF EXISTS "Participants can view answers in their room" ON public.duel_answers;

CREATE POLICY "Participants can view answers in their room" ON public.duel_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_rooms
      WHERE (duel_rooms.id = duel_answers.room_id) 
      AND (
        (duel_rooms.host_id = (auth.uid())::text) 
        OR (duel_rooms.guest_id = (auth.uid())::text) 
        OR (duel_rooms.player_3_id = (auth.uid())::text)
        OR (duel_rooms.player_4_id = (auth.uid())::text)
        OR (duel_rooms.host_id ~~ 'guest_%'::text) 
        OR (duel_rooms.guest_id ~~ 'guest_%'::text)
        OR (duel_rooms.player_3_id ~~ 'guest_%'::text)
        OR (duel_rooms.player_4_id ~~ 'guest_%'::text)
      )
    )
  );