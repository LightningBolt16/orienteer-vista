
import { useEffect } from 'react';

// Simple hook to log component lifecycle events
export function useLogger(componentName: string, props?: any) {
  useEffect(() => {
    console.log(`${componentName} mounted`, props);
    
    return () => {
      console.log(`${componentName} unmounted`);
    };
  }, [componentName, props]);

  // Log any prop changes
  useEffect(() => {
    console.log(`${componentName} props updated`, props);
  }, [componentName, props]);
}
