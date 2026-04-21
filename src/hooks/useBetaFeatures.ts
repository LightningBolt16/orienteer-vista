import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface BetaFeaturesState {
  betaEnabled: boolean;
  introSeen: boolean;
  loading: boolean;
}

export function useBetaFeatures() {
  const { user } = useUser();
  const [state, setState] = useState<BetaFeaturesState>({
    betaEnabled: false,
    introSeen: false,
    loading: true,
  });

  const isAuthenticated = !!user && user.id !== '1';

  const fetchState = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ betaEnabled: false, introSeen: false, loading: false });
      return;
    }
    const { data } = await (supabase
      .from('user_profiles' as any)
      .select('beta_features_enabled, beta_intro_seen')
      .eq('user_id', user!.id)
      .maybeSingle() as any);
    setState({
      betaEnabled: !!data?.beta_features_enabled,
      introSeen: !!data?.beta_intro_seen,
      loading: false,
    });
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const setBetaEnabled = useCallback(
    async (enabled: boolean) => {
      if (!isAuthenticated) return;
      setState((s) => ({ ...s, betaEnabled: enabled }));
      await (supabase
        .from('user_profiles' as any)
        .update({ beta_features_enabled: enabled })
        .eq('user_id', user!.id) as any);
    },
    [isAuthenticated, user]
  );

  const markIntroSeen = useCallback(async () => {
    if (!isAuthenticated) return;
    setState((s) => ({ ...s, introSeen: true }));
    await (supabase
      .from('user_profiles' as any)
      .update({ beta_intro_seen: true })
      .eq('user_id', user!.id) as any);
  }, [isAuthenticated, user]);

  return {
    betaEnabled: state.betaEnabled,
    introSeen: state.introSeen,
    loading: state.loading,
    setBetaEnabled,
    markIntroSeen,
    refetch: fetchState,
  };
}
