-- Drop all policies that reference the uuid columns
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON duel_rooms;
DROP POLICY IF EXISTS "Host can delete their room" ON duel_rooms;
DROP POLICY IF EXISTS "Participants can update their room" ON duel_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in or waiting rooms" ON duel_rooms;

DROP POLICY IF EXISTS "Participants can view answers in their room" ON duel_answers;
DROP POLICY IF EXISTS "Participants can insert their answers" ON duel_answers;

-- Alter column types to text to support guest IDs
ALTER TABLE duel_rooms 
  ALTER COLUMN host_id TYPE text USING host_id::text,
  ALTER COLUMN guest_id TYPE text USING guest_id::text;

ALTER TABLE duel_answers
  ALTER COLUMN player_id TYPE text USING player_id::text;

-- Recreate policies for duel_rooms with text comparison
CREATE POLICY "Users can create rooms"
ON duel_rooms FOR INSERT
WITH CHECK (host_id = auth.uid()::text OR host_id LIKE 'guest_%');

CREATE POLICY "Host can delete their room"
ON duel_rooms FOR DELETE
USING (host_id = auth.uid()::text OR host_id LIKE 'guest_%');

CREATE POLICY "Participants can update their room"
ON duel_rooms FOR UPDATE
USING (host_id = auth.uid()::text OR guest_id = auth.uid()::text OR host_id LIKE 'guest_%' OR guest_id LIKE 'guest_%');

CREATE POLICY "Users can view rooms they participate in or waiting rooms"
ON duel_rooms FOR SELECT
USING (
  host_id = auth.uid()::text 
  OR guest_id = auth.uid()::text 
  OR (status = 'waiting' AND guest_id IS NULL)
  OR host_id LIKE 'guest_%'
  OR guest_id LIKE 'guest_%'
);

-- Recreate policies for duel_answers with text comparison
CREATE POLICY "Participants can view answers in their room"
ON duel_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM duel_rooms
    WHERE duel_rooms.id = duel_answers.room_id
    AND (duel_rooms.host_id = auth.uid()::text OR duel_rooms.guest_id = auth.uid()::text 
         OR duel_rooms.host_id LIKE 'guest_%' OR duel_rooms.guest_id LIKE 'guest_%')
  )
);

CREATE POLICY "Participants can insert their answers"
ON duel_answers FOR INSERT
WITH CHECK (
  (player_id = auth.uid()::text OR player_id LIKE 'guest_%')
  AND EXISTS (
    SELECT 1 FROM duel_rooms
    WHERE duel_rooms.id = duel_answers.room_id
    AND (duel_rooms.host_id = auth.uid()::text OR duel_rooms.guest_id = auth.uid()::text
         OR duel_rooms.host_id LIKE 'guest_%' OR duel_rooms.guest_id LIKE 'guest_%')
  )
);