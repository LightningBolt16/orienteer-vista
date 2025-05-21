
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNetworkStatus, subscribeToNetworkStatus } from '@/lib/networkUtils';
import { toast } from '@/components/ui/use-toast';

interface NetworkContextType {
  isOnline: boolean;
  lastOnlineTime: Date | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(getNetworkStatus());
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(isOnline ? new Date() : null);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((online) => {
      setIsOnline(online);
      
      if (online) {
        setLastOnlineTime(new Date());
        toast({
          title: "Connection restored",
          description: "You are back online. Data will sync now.",
          duration: 3000,
        });
      } else {
        toast({
          title: "You are offline",
          description: "Some features may be limited until your connection is restored.",
          duration: 5000,
          variant: "destructive"
        });
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Function to manually check connection by pinging Supabase
  const checkConnection = async (): Promise<boolean> => {
    try {
      const { supabase } = await import('../integrations/supabase/client');
      
      const { error } = await supabase.from('user_profiles')
        .select('id')
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      if (!isOnline) {
        setIsOnline(true);
        setLastOnlineTime(new Date());
        toast({
          title: "Connection restored",
          description: "You are back online. Data will sync now.",
          duration: 3000,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      
      if (isOnline) {
        setIsOnline(false);
        toast({
          title: "Connection lost",
          description: "You appear to be offline. Some features may be limited.",
          duration: 5000,
          variant: "destructive"
        });
      }
      
      return false;
    }
  };

  return (
    <NetworkContext.Provider value={{ isOnline, lastOnlineTime, checkConnection }}>
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
