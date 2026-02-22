
-- Create feature_requests table for pro/club users
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own feature requests
CREATE POLICY "Users can view their own feature requests"
  ON public.feature_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users with pro access can insert feature requests
CREATE POLICY "Pro users can insert feature requests"
  ON public.feature_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_pro_access(auth.uid()));

-- Admins can view all feature requests
CREATE POLICY "Admins can view all feature requests"
  ON public.feature_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update feature requests (change status)
CREATE POLICY "Admins can update feature requests"
  ON public.feature_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
