-- Add a table to track individual route attempts for rolling 100 route calculation
CREATE TABLE public.route_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  map_name TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.route_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all route attempts"
ON public.route_attempts
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own route attempts"
ON public.route_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_route_attempts_user_map ON public.route_attempts (user_id, map_name, created_at DESC);
CREATE INDEX idx_route_attempts_user_created ON public.route_attempts (user_id, created_at DESC);

-- Create a function to clean up old attempts (keep only last 100 per user per map)
CREATE OR REPLACE FUNCTION public.cleanup_old_route_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete attempts older than the most recent 100 for this user and map
  DELETE FROM public.route_attempts
  WHERE id IN (
    SELECT id FROM public.route_attempts
    WHERE user_id = NEW.user_id AND map_name = NEW.map_name
    ORDER BY created_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$;

-- Create trigger to clean up old attempts after insert
CREATE TRIGGER cleanup_route_attempts_trigger
AFTER INSERT ON public.route_attempts
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_route_attempts();