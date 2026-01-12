-- Add num_alternates column to route_images for multi-alternate support
ALTER TABLE public.route_images 
ADD COLUMN IF NOT EXISTS num_alternates INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS alt_route_lengths JSONB DEFAULT NULL;