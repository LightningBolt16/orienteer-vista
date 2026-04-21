-- Add beta toggle columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS beta_features_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_intro_seen boolean NOT NULL DEFAULT false;

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL CHECK (feature IN ('route_finder', 'route_navigator')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own beta feedback"
  ON public.beta_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own beta feedback"
  ON public.beta_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all beta feedback"
  ON public.beta_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON public.beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_feature ON public.beta_feedback(feature);