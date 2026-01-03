-- Create route_maps table to store map metadata
CREATE TABLE public.route_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create route_images table to store individual route data
CREATE TABLE public.route_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.route_maps(id) ON DELETE CASCADE,
  candidate_index INTEGER NOT NULL,
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16:9', '9:16')),
  shortest_side TEXT NOT NULL CHECK (shortest_side IN ('left', 'right')),
  main_route_length DECIMAL,
  alt_route_length DECIMAL,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(map_id, candidate_index, aspect_ratio)
);

-- Enable RLS
ALTER TABLE public.route_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_images ENABLE ROW LEVEL SECURITY;

-- Public read access for all authenticated users (routes are public content)
CREATE POLICY "Anyone can view route maps"
  ON public.route_maps
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view route images"
  ON public.route_images
  FOR SELECT
  USING (true);

-- Only admins can manage route data
CREATE POLICY "Admins can insert route maps"
  ON public.route_maps
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update route maps"
  ON public.route_maps
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete route maps"
  ON public.route_maps
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert route images"
  ON public.route_images
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update route images"
  ON public.route_images
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete route images"
  ON public.route_images
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_route_images_map_id ON public.route_images(map_id);
CREATE INDEX idx_route_images_aspect ON public.route_images(aspect_ratio);

-- Create trigger for updated_at on route_maps
CREATE TRIGGER update_route_maps_updated_at
  BEFORE UPDATE ON public.route_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for route images
INSERT INTO storage.buckets (id, name, public) VALUES ('route-images', 'route-images', true);

-- Storage policies for route-images bucket
CREATE POLICY "Route images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'route-images');

CREATE POLICY "Admins can upload route images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'route-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update route images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'route-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete route images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'route-images' AND has_role(auth.uid(), 'admin'::app_role));