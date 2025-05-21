
/**
 * Network status utility functions for managing connectivity
 */

// Online status tracking with default value
let isOnline = navigator.onLine;

// Callback registry for network status changes
const networkCallbacks: Array<(online: boolean) => void> = [];

// Initialize network listeners
(() => {
  window.addEventListener('online', () => {
    isOnline = true;
    networkCallbacks.forEach(cb => cb(true));
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    networkCallbacks.forEach(cb => cb(false));
  });
})();

/**
 * Get current network status
 */
export const getNetworkStatus = (): boolean => {
  return isOnline;
};

/**
 * Subscribe to network status changes
 * @param callback Function called when network status changes
 * @returns Unsubscribe function
 */
export const subscribeToNetworkStatus = (callback: (online: boolean) => void): () => void => {
  networkCallbacks.push(callback);
  
  // Call once with current status
  setTimeout(() => callback(isOnline), 0);
  
  // Return unsubscribe function
  return () => {
    const index = networkCallbacks.indexOf(callback);
    if (index > -1) {
      networkCallbacks.splice(index, 1);
    }
  };
};

/**
 * Enhanced fetch utility with network status check
 */
export const safeFetch = async (
  url: string, 
  options?: RequestInit
): Promise<Response> => {
  if (!isOnline) {
    throw new Error('You are offline. Please check your internet connection and try again.');
  }
  
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error('Connection failed. Please check your internet connection and try again.');
  }
};

/**
 * Wrapper for the fetch function in Supabase client
 */
export const enhanceSupabaseFetch = () => {
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Check if it's a Supabase request (has Supabase URL)
    if (typeof input === 'string' && input.includes('supabase.co')) {
      return safeFetch(input, init);
    }
    
    // For non-Supabase requests, use original fetch
    return originalFetch.apply(window, [input, init as any]);
  };
};
