
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'sv' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  sv: {
    'route.game': 'Vägvalsspel',
    'course.setter': 'Banläggare',
    'profile': 'Profil',
    'points': 'poäng',
    'route.choose': 'Välj rutt',
    'route.instruction': 'Välj rätt riktning för den här rutten för att tjäna poäng',
    'leaderboard': 'Topplista',
    'coming.soon': 'Kommer snart',
    'coming.soon.description': 'Nya spännande funktioner på gång!'
  },
  en: {
    'route.game': 'Route Choice Game',
    'course.setter': 'Course Setter',
    'profile': 'Profile',
    'points': 'points',
    'route.choose': 'Route Selector',
    'route.instruction': 'Choose the correct direction for this route to earn points',
    'leaderboard': 'Leaderboard',
    'coming.soon': 'Coming Soon',
    'coming.soon.description': 'New exciting features are on the way!'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('sv');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
