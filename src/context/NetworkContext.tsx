
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkContextType {
  isOnline: boolean;
  isConnectedToSupabase: boolean;
  showOfflineMode: boolean;
  retryConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnectedToSupabase, setIsConnectedToSupabase] = useState(true);
  const [showOfflineMode, setShowOfflineMode] = useState(false);
  const { toast } = useToast();

  const checkSupabaseConnection = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('user_profiles').select('count').limit(1);
      
      if (error) {
        setIsConnectedToSupabase(false);
        toast({
          title: "Connection Issue",
          description: "Unable to connect to database. Some features may be limited.",
          variant: "destructive"
        });
        return false;
      } else {
        setIsConnectedToSupabase(true);
        toast({
          title: "Connection Restored",
          description: "Successfully connected to database."
        });
        return true;
      }
    } catch (error) {
      setIsConnectedToSupabase(false);
      return false;
    }
  };

  const retryConnection = async () => {
    if (isOnline) {
      await checkSupabaseConnection();
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMode(false);
      checkSupabaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnectedToSupabase(false);
      setShowOfflineMode(true);
      toast({
        title: "You're Offline",
        description: "Some features may not be available until you reconnect.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkSupabaseConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show offline mode after 5 seconds of being offline
  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowOfflineMode(true);
        toast({
          title: "Still Offline",
          description: "Working in offline mode. Data will sync when connection is restored."
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isConnectedToSupabase,
      showOfflineMode,
      retryConnection
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
