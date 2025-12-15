-- Add tutorial_seen column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tutorial_seen BOOLEAN NOT NULL DEFAULT false;