-- Create user_maps table for storing user-uploaded map source files
CREATE TABLE public.user_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color_tif_path TEXT NOT NULL,
  bw_tif_path TEXT NOT NULL,
  roi_coordinates JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add user ownership columns to route_maps
ALTER TABLE public.route_maps 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_map_id UUID;

-- Add foreign key constraint for source_map_id
ALTER TABLE public.route_maps
  ADD CONSTRAINT fk_route_maps_source_map
  FOREIGN KEY (source_map_id) REFERENCES public.user_maps(id) ON DELETE SET NULL;

-- Enable RLS on user_maps
ALTER TABLE public.user_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_maps
CREATE POLICY "Users can view their own maps"
ON public.user_maps
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maps"
ON public.user_maps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maps"
ON public.user_maps
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maps"
ON public.user_maps
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user maps"
ON public.user_maps
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all user maps"
ON public.user_maps
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update route_maps RLS to handle user ownership
CREATE POLICY "Users can view their own private route maps"
ON public.route_maps
FOR SELECT
USING (user_id = auth.uid() AND is_public = false);

-- Create trigger for updated_at on user_maps
CREATE TRIGGER update_user_maps_updated_at
BEFORE UPDATE ON public.user_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for user map source files (TIF files)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-map-sources', 'user-map-sources', false);

-- Create storage bucket for user-generated route images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-route-images', 'user-route-images', false);

-- Storage policies for user-map-sources bucket
CREATE POLICY "Users can upload their own map sources"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-map-sources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own map sources"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-map-sources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own map sources"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-map-sources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can access all map sources"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'user-map-sources' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Storage policies for user-route-images bucket
CREATE POLICY "Users can view their own route images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-route-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage user route images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'user-route-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);