
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export async function fetchWithRetry(
  fetchFn: () => Promise<any>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<any> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
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
