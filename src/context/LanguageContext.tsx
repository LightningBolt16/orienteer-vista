
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
    'coming.soon.description': 'Nya spännande funktioner på gång!',
    'orienteers': 'orienterare',
    'orienteering.enthusiast': 'Orienteringsentusiast',
    'rank': 'Rankning',
    'your.statistics': 'Dina statistik',
    'avg.response.time': 'Genomsnittlig svarstid',
    'total.attempts': 'Totala försök',
    'accuracy': 'Precision',
    'correct.choices': 'Korrekta val',
    'incorrect.choices': 'Felaktiga val',
    'you': 'du',
    'profile.updated': 'Profil uppdaterad',
    'profile.update.success': 'Din profil har uppdaterats framgångsrikt',
    'invalid.name': 'Ogiltigt namn',
    'name.empty': 'Namnet kan inte vara tomt',
    'excellent': 'Utmärkt!',
    'good': 'Bra!',
    'correct': 'Korrekt!',
    'wrong': 'Fel!'
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
    'coming.soon.description': 'New exciting features are on the way!',
    'orienteers': 'orienteers',
    'orienteering.enthusiast': 'Orienteering Enthusiast',
    'rank': 'Rank',
    'your.statistics': 'Your Statistics',
    'avg.response.time': 'Average Response Time',
    'total.attempts': 'Total Attempts',
    'accuracy': 'Accuracy',
    'correct.choices': 'Correct Choices',
    'incorrect.choices': 'Incorrect Choices',
    'you': 'you',
    'profile.updated': 'Profile Updated',
    'profile.update.success': 'Your profile has been updated successfully',
    'invalid.name': 'Invalid Name',
    'name.empty': 'Name cannot be empty',
    'excellent': 'Excellent!',
    'good': 'Good!',
    'correct': 'Correct!',
    'wrong': 'Wrong!'
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
