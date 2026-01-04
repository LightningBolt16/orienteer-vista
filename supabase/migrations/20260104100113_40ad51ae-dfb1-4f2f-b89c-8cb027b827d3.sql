-- Add player name columns to duel_rooms
ALTER TABLE duel_rooms 
ADD COLUMN IF NOT EXISTS host_name text,
ADD COLUMN IF NOT EXISTS guest_name text;