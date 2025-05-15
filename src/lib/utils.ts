
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
