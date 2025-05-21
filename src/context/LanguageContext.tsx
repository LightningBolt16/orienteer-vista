
import React, { createContext, useState, useEffect, useContext } from 'react';
import { detectBrowserLanguage, localCache } from '@/lib/utils';

// Define supported languages
const SUPPORTED_LANGUAGES = ['en', 'sv'];

// Define translation dictionary
const translations: Record<string, Record<string, string>> = {
  'en': {
    'welcome': 'Welcome',
    'to': 'to',
    'start': 'Start',
    'routeGame': 'Route Game',
    'courseSetter': 'Course Setter',
    'myProjects': 'My Projects',
    'profile': 'Profile',
    'signIn': 'Sign In',
    'signOut': 'Sign Out',
    'register': 'Register',
    'signingIn': 'Signing in...',
    'registering': 'Registering...',
    'email': 'Email',
    'password': 'Password',
    'name': 'Name',
    'fullName': 'Full Name',
    'welcomeTo': 'Welcome to',
    'authDescription': 'Sign in to your account or create a new one.',
    'authDisclaimer': 'By signing in, you agree to our Terms of Service and Privacy Policy.',
    'tryAgainLater': 'Please try again later or check your connection.',
    'connectionError': 'Connection error',
    'retry': 'Retry',
    'profileFetchError': 'Failed to fetch your profile. Please try again.',
    'checkConnection': 'Please check your internet connection and try again.',
    'signInError': 'Sign in error',
    'signUpError': 'Sign up error',
    'verifyEmail': 'Verify email',
    'verifyEmailDescription': 'Please check your email to verify your account.',
    'signOutError': 'Sign out error',
    'you': 'You',
    'rank': 'Rank',
    'guest': 'Guest',
    'subscription': 'Subscription',
    'loading': 'Loading...',
    'error': 'Error',
    'leaderboard': 'Leaderboard',
    'connectionRestored': 'Connection restored',
    'dataRefreshed': 'Your data has been refreshed',
    'accuracy': 'Accuracy',
    'speed': 'Speed',
    'overall': 'Overall',
    'orienteers': 'Orienteers',
    'refresh': 'Refresh',
    'noLeaderboardData': 'No leaderboard data available',
    'emptyLeaderboard': 'Be the first to complete a route!',
    'leaderboardFetchError': 'We couldn\'t load the leaderboard data.',
    'offlineError': 'You are currently offline. Please check your internet connection and try again.',
    'youAreOffline': 'You are offline',
    'backOnline': 'Back online',
    'tryingToConnect': 'Trying to connect...',
    'noNetworkNoLogin': 'Cannot sign in while offline',
    'language': 'Language',
    'english': 'English',
    'swedish': 'Swedish'
  },
  'sv': {
    'welcome': 'Välkommen',
    'to': 'till',
    'start': 'Start',
    'routeGame': 'Ruttspel',
    'courseSetter': 'Banläggare',
    'myProjects': 'Mina projekt',
    'profile': 'Profil',
    'signIn': 'Logga in',
    'signOut': 'Logga ut',
    'register': 'Registrera',
    'signingIn': 'Loggar in...',
    'registering': 'Registrerar...',
    'email': 'E-post',
    'password': 'Lösenord',
    'name': 'Namn',
    'fullName': 'Fullständigt namn',
    'welcomeTo': 'Välkommen till',
    'authDescription': 'Logga in på ditt konto eller skapa ett nytt.',
    'authDisclaimer': 'Genom att logga in godkänner du våra användarvillkor och sekretesspolicy.',
    'tryAgainLater': 'Försök igen senare eller kontrollera din anslutning.',
    'connectionError': 'Anslutningsfel',
    'retry': 'Försök igen',
    'profileFetchError': 'Kunde inte hämta din profil. Vänligen försök igen.',
    'checkConnection': 'Kontrollera din internetanslutning och försök igen.',
    'signInError': 'Inloggningsfel',
    'signUpError': 'Registreringsfel',
    'verifyEmail': 'Verifiera e-post',
    'verifyEmailDescription': 'Kontrollera din e-post för att verifiera ditt konto.',
    'signOutError': 'Utloggningsfel',
    'you': 'Du',
    'rank': 'Rank',
    'guest': 'Gäst',
    'subscription': 'Prenumeration',
    'loading': 'Laddar...',
    'error': 'Fel',
    'leaderboard': 'Topplista',
    'connectionRestored': 'Anslutning återställd',
    'dataRefreshed': 'Din data har uppdaterats',
    'accuracy': 'Precision',
    'speed': 'Hastighet',
    'overall': 'Totalt',
    'orienteers': 'Orienterare',
    'refresh': 'Uppdatera',
    'noLeaderboardData': 'Ingen topplistedata tillgänglig',
    'emptyLeaderboard': 'Var först med att slutföra en rutt!',
    'leaderboardFetchError': 'Vi kunde inte ladda topplistedata.',
    'offlineError': 'Du är för närvarande offline. Kontrollera din internetanslutning och försök igen.',
    'youAreOffline': 'Du är offline',
    'backOnline': 'Tillbaka online',
    'tryingToConnect': 'Försöker ansluta...',
    'noNetworkNoLogin': 'Kan inte logga in medan du är offline',
    'language': 'Språk',
    'english': 'Engelska',
    'swedish': 'Svenska'
  }
};

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  translations: Record<string, Record<string, string>>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // Get preferred language from localStorage or browser preference
  const [language, setLanguageState] = useState(() => {
    const savedLanguage = localCache.get<string>('preferredLanguage', '');
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Detect browser language
    const browserLang = detectBrowserLanguage();
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
  });

  // Update language in localStorage when it changes
  const setLanguage = (newLanguage: string) => {
    if (SUPPORTED_LANGUAGES.includes(newLanguage)) {
      setLanguageState(newLanguage);
      localCache.set('preferredLanguage', newLanguage);
    }
  };

  // Translation function
  const t = (key: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    
    // Fallback to English
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    
    // If key not found, return the key itself
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const getSupportedLanguages = () => SUPPORTED_LANGUAGES;
