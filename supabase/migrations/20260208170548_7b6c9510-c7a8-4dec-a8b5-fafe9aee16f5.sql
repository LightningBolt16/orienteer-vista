-- Migration: Add country and onboarding columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;