-- Create table for per-map user statistics
CREATE TABLE public.user_map_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  map_name TEXT NOT NULL,
  accuracy NUMERIC DEFAULT 0,
  speed NUMERIC DEFAULT 0,
  attempts JSONB DEFAULT '{"total": 0, "correct": 0, "timeSum": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, map_name)
);

-- Enable Row Level Security
ALTER TABLE public.user_map_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all map stats" 
ON public.user_map_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own map stats" 
ON public.user_map_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own map stats" 
ON public.user_map_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_map_stats_updated_at
BEFORE UPDATE ON public.user_map_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();