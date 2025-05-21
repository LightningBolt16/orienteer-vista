
import React, { useState, useEffect } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, checkConnection } = useNetwork();
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();
  
  // Only show the indicator when offline
  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
    } else {
      // When going back online, wait a bit before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline]);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 p-3 rounded-lg shadow-lg transition-all duration-300",
        isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-5 w-5" />
          <span>{t('backOnline') || 'Back online'}</span>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5" />
          <span>{t('youAreOffline') || 'You are offline'}</span>
          <Button 
            size="sm" 
            variant="ghost" 
            className="ml-2 hover:bg-red-200"
            onClick={() => checkConnection()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('retry') || 'Retry'}
          </Button>
        </>
      )}
    </div>
  );
};
