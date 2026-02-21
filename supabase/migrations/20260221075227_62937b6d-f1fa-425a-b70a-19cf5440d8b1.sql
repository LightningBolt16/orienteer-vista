
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'personal', 'club')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_end timestamp with time zone,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_club_id ON public.subscriptions(club_id) WHERE club_id IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role handles inserts/updates via webhook (no user-facing write policies needed)
-- The webhook uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- Update has_pro_access function to also check subscriptions
CREATE OR REPLACE FUNCTION public.has_pro_access(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Check user_roles for admin or pro
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'pro')
  ) OR EXISTS (
    -- Check active personal subscription
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND plan_type IN ('personal', 'club')
  ) OR EXISTS (
    -- Check if user belongs to a club with an active club subscription
    SELECT 1 FROM public.club_members cm
    JOIN public.subscriptions s ON s.club_id = cm.club_id
    WHERE cm.user_id = _user_id
      AND s.status = 'active'
      AND s.plan_type = 'club'
  )
$$;
