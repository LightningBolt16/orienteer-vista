import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

/**
 * Hook to check if the current user has pro access.
 * Pro access is granted to users with either 'admin' or 'pro' role.
 */
export function useProAccess() {
  const { user } = useUser();
  const [hasPro, setHasPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkProAccess = useCallback(async () => {
    if (!user) {
      setHasPro(false);
      setLoading(false);
      return;
    }

    try {
      // Use the database function to check pro access
      const { data, error } = await supabase.rpc('has_pro_access', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error checking pro access:', error);
        setHasPro(false);
      } else {
        setHasPro(data === true);
      }
    } catch (error) {
      console.error('Error checking pro access:', error);
      setHasPro(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkProAccess();
  }, [checkProAccess]);

  return {
    hasPro,
    loading,
    refetch: checkProAccess,
  };
}
