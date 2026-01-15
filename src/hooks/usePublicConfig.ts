import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicConfig {
  mapboxToken: string;
}

interface UsePublicConfigResult {
  config: PublicConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePublicConfig = (): UsePublicConfigResult => {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('public-config');
      
      if (fnError) {
        throw fnError;
      }
      
      setConfig(data as PublicConfig);
    } catch (err) {
      console.error('Failed to fetch public config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return { config, loading, error, refetch: fetchConfig };
};
