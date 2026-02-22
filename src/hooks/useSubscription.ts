import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export type PlanType = 'free' | 'personal' | 'club';

export interface SubscriptionState {
  plan: PlanType;
  isActive: boolean;
  isManual: boolean;
  clubId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

// Stripe product/price mapping
export const STRIPE_PLANS = {
  personal: {
    product_id: "prod_U1gEfKft0U0MEA",
    price_id: "price_1T3crbGrzNv0iKS9FcNOBmtP",
    name: "Personal",
    price: "29 kr/mo",
  },
  club: {
    product_id: "prod_U1gHySCgj6lLk2",
    price_id: "price_1T3cudGrzNv0iKS9fjTNLdrC",
    name: "Club",
    price: "100 kr/mo",
  },
} as const;

export function useSubscription(): SubscriptionState {
  const { user } = useUser();
  const [plan, setPlan] = useState<PlanType>('free');
  const [isActive, setIsActive] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setPlan('free');
      setIsActive(false);
      setIsManual(false);
      setClubId(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        setPlan('free');
        setIsActive(false);
        setIsManual(false);
        setClubId(null);
      } else if (data) {
        setPlan(data.plan || 'free');
        setIsActive(data.subscribed === true);
        setIsManual(data.is_manual === true);
        setClubId(data.club_id || null);
        setSubscriptionEnd(data.subscription_end || null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setPlan('free');
      setIsActive(false);
      setIsManual(false);
      setClubId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return { plan, isActive, isManual, clubId, subscriptionEnd, loading, refetch: checkSubscription };
}
