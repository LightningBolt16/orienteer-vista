-- Enable realtime for user_maps table
ALTER TABLE public.user_maps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_maps;