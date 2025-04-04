
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
    'wrong': 'Fel!',
    // Course Setter translations
    'new.event': 'Nytt evenemang',
    'my.maps': 'Mina kartor',
    'map.uploaded.successfully': 'Kartan har laddats upp',
    'success': 'Framgång',
    'event.date': 'Datum',
    'preview.mode': 'Förhandsgranskningsläge',
    'edit.mode': 'Redigeringsläge',
    'print': 'Skriv ut',
    'toggle.layers': 'Växla lager',
    'export': 'Exportera',
    'back': 'Tillbaka',
    'save': 'Spara',
    'pointer.tool': 'Pekare',
    'move.map': 'Flytta karta',
    'add.control': 'Lägg till kontroll',
    'add.start': 'Lägg till start',
    'add.finish': 'Lägg till mål',
    'zoom.in': 'Zooma in',
    'zoom.out': 'Zooma ut',
    'advanced.tools': 'Avancerade verktyg',
    'crossing.point': 'Korsningspunkt',
    'uncrossable.boundary': 'Oöverstiglig gräns',
    'out.of.bounds': 'Förbjudet område',
    'water.station': 'Vattenstation',
    'reset.view': 'Återställ vy',
    'print.settings': 'Utskriftsinställningar',
    'configure.print.settings.for': 'Konfigurera utskriftsinställningar för',
    'paper.size': 'Pappersstorlek',
    'select.paper.size': 'Välj pappersstorlek',
    'orientation': 'Orientering',
    'portrait': 'Stående',
    'landscape': 'Liggande',
    'map.scale': 'Kartskala',
    'copies': 'Kopior',
    'include': 'Inkludera',
    'control.descriptions': 'Kontrollbeskrivningar',
    'course.details': 'Bandetaljer',
    'cancel': 'Avbryt',
    'print.area': 'Utskriftsområde',
    'show.courses': 'Visa banor',
    'show.control.numbers': 'Visa kontrollnummer',
    'error.map.not.found': 'Fel: Karta hittades inte'
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
    'wrong': 'Wrong!',
    // Course Setter translations
    'new.event': 'New Event',
    'my.maps': 'My Maps',
    'map.uploaded.successfully': 'Map uploaded successfully',
    'success': 'Success',
    'event.date': 'Event Date',
    'preview.mode': 'Preview Mode',
    'edit.mode': 'Edit Mode',
    'print': 'Print',
    'toggle.layers': 'Toggle Layers',
    'export': 'Export',
    'back': 'Back',
    'save': 'Save',
    'pointer.tool': 'Pointer',
    'move.map': 'Move Map',
    'add.control': 'Add Control',
    'add.start': 'Add Start',
    'add.finish': 'Add Finish',
    'zoom.in': 'Zoom In',
    'zoom.out': 'Zoom Out',
    'advanced.tools': 'Advanced Tools',
    'crossing.point': 'Crossing Point',
    'uncrossable.boundary': 'Uncrossable Boundary',
    'out.of.bounds': 'Out of Bounds',
    'water.station': 'Water Station',
    'reset.view': 'Reset View',
    'print.settings': 'Print Settings',
    'configure.print.settings.for': 'Configure print settings for',
    'paper.size': 'Paper Size',
    'select.paper.size': 'Select paper size',
    'orientation': 'Orientation',
    'portrait': 'Portrait',
    'landscape': 'Landscape',
    'map.scale': 'Map Scale',
    'copies': 'Copies',
    'include': 'Include',
    'control.descriptions': 'Control Descriptions',
    'course.details': 'Course Details',
    'cancel': 'Cancel',
    'print.area': 'Print Area',
    'show.courses': 'Show Courses',
    'show.control.numbers': 'Show Control Numbers',
    'error.map.not.found': 'Error: Map not found'
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
