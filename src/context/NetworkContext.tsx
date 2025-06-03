
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabaseManager, SupabaseHealthStatus } from '@/lib/supabaseUtils';

interface NetworkContextType {
  isOnline: boolean;
  isConnectedToSupabase: boolean;
  supabaseHealth: SupabaseHealthStatus | null;
  showOfflineMode: boolean;
  retryConnection: () => Promise<void>;
  lastHealthCheck: number;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnectedToSupabase, setIsConnectedToSupabase] = useState(true);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealthStatus | null>(null);
  const [showOfflineMode, setShowOfflineMode] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(0);
  const [lastToastType, setLastToastType] = useState<string | null>(null);
  const { toast } = useToast();

  const showToastOnce = useCallback((type: string, title: string, description: string, variant?: 'default' | 'destructive') => {
    // Prevent showing the same toast type repeatedly
    if (lastToastType !== type) {
      toast({
        title,
        description,
        variant
      });
      setLastToastType(type);
    }
  }, [toast, lastToastType]);

  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    try {
      const health = await supabaseManager.checkSupabaseHealth();
      setSupabaseHealth(health);
      setLastHealthCheck(Date.now());
      
      if (health.isHealthy) {
        setIsConnectedToSupabase(true);
        
        // Only show success message if we were previously disconnected
        if (!isConnectedToSupabase && isOnline) {
          showToastOnce('connection-restored', 'Connection Restored', 'Successfully connected to database.');
        }
        
        return true;
      } else {
        setIsConnectedToSupabase(false);
        
        // Show error only if we're online (to avoid redundant offline messages)
        if (isOnline) {
          showToastOnce('connection-issue', 'Connection Issue', 'Unable to connect to database. Some features may be limited.', 'destructive');
        }
        
        return false;
      }
    } catch (error: any) {
      console.error('Health check failed:', error);
      setIsConnectedToSupabase(false);
      setSupabaseHealth({
        isHealthy: false,
        error: error.message || 'Health check failed'
      });
      setLastHealthCheck(Date.now());
      
      if (isOnline) {
        showToastOnce('connection-error', 'Connection Error', 'Database health check failed. Please try again later.', 'destructive');
      }
      
      return false;
    }
  }, [isConnectedToSupabase, isOnline, showToastOnce]);

  const retryConnection = useCallback(async () => {
    if (isOnline) {
      // Clear cache to force fresh health check
      supabaseManager.clearCache();
      setLastToastType(null); // Allow new toast messages
      await checkSupabaseConnection();
    }
  }, [isOnline, checkSupabaseConnection]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowOfflineMode(false);
      setLastToastType(null); // Reset toast tracking when coming online
      
      // Wait a moment for connection to stabilize before checking Supabase
      setTimeout(() => {
        checkSupabaseConnection();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnectedToSupabase(false);
      setShowOfflineMode(true);
      
      showToastOnce('offline', "You're Offline", 'Some features may not be available until you reconnect.', 'destructive');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    if (isOnline) {
      checkSupabaseConnection();
    }

    // Set up periodic health checks (every 2 minutes when online)
    const healthCheckInterval = setInterval(() => {
      if (isOnline) {
        checkSupabaseConnection();
      }
    }, 120000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, [isOnline, checkSupabaseConnection, showToastOnce]);

  // Show offline mode after 5 seconds of being offline
  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowOfflineMode(true);
        showToastOnce('still-offline', 'Still Offline', 'Working in offline mode. Data will sync when connection is restored.');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, showToastOnce]);

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isConnectedToSupabase,
      supabaseHealth,
      showOfflineMode,
      retryConnection,
      lastHealthCheck
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
