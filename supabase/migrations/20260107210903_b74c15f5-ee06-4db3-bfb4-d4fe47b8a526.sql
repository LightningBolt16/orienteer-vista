-- Add R2 storage columns to user_maps table
ALTER TABLE public.user_maps 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS r2_color_key TEXT,
ADD COLUMN IF NOT EXISTS r2_bw_key TEXT;