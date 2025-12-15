-- Add previous_rank column to track rank changes
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS previous_rank INTEGER DEFAULT NULL;

-- Add previous_rank column to user_map_stats as well
ALTER TABLE public.user_map_stats 
ADD COLUMN IF NOT EXISTS previous_rank INTEGER DEFAULT NULL;