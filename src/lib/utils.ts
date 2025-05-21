
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getNetworkStatus } from "./networkUtils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function detectBrowserLanguage(): string {
  const userLang = navigator.language || navigator.languages?.[0] || 'en';
  return userLang.substring(0, 2).toLowerCase();
}

export function getBrowserPreferredLanguage(supportedLanguages: string[]): string {
  const browserLang = detectBrowserLanguage();
  return supportedLanguages.includes(browserLang) ? browserLang : 'en';
}

/**
 * Enhanced fetch utility with retry mechanism and network status check
 */
export async function fetchWithRetry(
  fetchFn: () => Promise<any>, 
  maxRetries: number = 3, 
  delay: number = 1000,
  requiresNetwork: boolean = true
): Promise<any> {
  let lastError;
  
  // Immediately check network status if required
  if (requiresNetwork && !getNetworkStatus()) {
    throw new Error('You are offline. Please check your internet connection and try again.');
  }
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error: any) {
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
      
      // Check if it's a network error
      if (error.message === 'Failed to fetch' || 
          error.message?.includes('network') || 
          error.message?.includes('offline')) {
        // Re-check network status
        if (!getNetworkStatus()) {
          throw new Error('You are offline. Please check your internet connection and try again.');
        }
      }
      
      lastError = error;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay *= 2;
    }
  }
  
  // All retries failed
  throw lastError;
}

/**
 * Cache for offline data storage
 */
export const localCache = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing in cache:', error);
    }
  }
};
