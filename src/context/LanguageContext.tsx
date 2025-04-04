
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'sv' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  sv: {
    'routeGame': 'Vägvalsspel',
    'courseSetter': 'Banläggare',
    'profile': 'Profil',
    'points': 'poäng',
    'routeChoose': 'Välj rutt',
    'routeInstruction': 'Välj rätt riktning för den här rutten för att tjäna poäng',
    'leaderboard': 'Topplista',
    'comingSoon': 'Kommer snart',
    'comingSoonDescription': 'Nya spännande funktioner på gång!',
    'orienteers': 'orienterare',
    'orienteeringEnthusiast': 'Orienteringsentusiast',
    'rank': 'Rankning',
    'yourStatistics': 'Dina statistik',
    'avgResponseTime': 'Genomsnittlig svarstid',
    'totalAttempts': 'Totala försök',
    'accuracy': 'Precision',
    'correctChoices': 'Korrekta val',
    'incorrectChoices': 'Felaktiga val',
    'you': 'du',
    'profileUpdated': 'Profil uppdaterad',
    'profileUpdateSuccess': 'Din profil har uppdaterats framgångsrikt',
    'invalidName': 'Ogiltigt namn',
    'nameEmpty': 'Namnet kan inte vara tomt',
    'excellent': 'Utmärkt!',
    'good': 'Bra!',
    'correct': 'Korrekt!',
    'wrong': 'Fel!',
    // Course Setter translations
    'newEvent': 'Nytt evenemang',
    'myMaps': 'Mina kartor',
    'mapUploadedSuccessfully': 'Kartan har laddats upp',
    'success': 'Framgång',
    'eventDate': 'Datum',
    'previewMode': 'Förhandsgranskningsläge',
    'editMode': 'Redigeringsläge',
    'print': 'Skriv ut',
    'toggleLayers': 'Växla lager',
    'export': 'Exportera',
    'back': 'Tillbaka',
    'save': 'Spara',
    'pointerTool': 'Pekare',
    'moveMap': 'Flytta karta',
    'addControl': 'Lägg till kontroll',
    'addStart': 'Lägg till start',
    'addFinish': 'Lägg till mål',
    'zoomIn': 'Zooma in',
    'zoomOut': 'Zooma ut',
    'advancedTools': 'Avancerade verktyg',
    'crossingPoint': 'Korsningspunkt',
    'uncrossableBoundary': 'Oöverstiglig gräns',
    'outOfBounds': 'Förbjudet område',
    'waterStation': 'Vattenstation',
    'resetView': 'Återställ vy',
    'printSettings': 'Utskriftsinställningar',
    'configurePrintSettingsFor': 'Konfigurera utskriftsinställningar för',
    'paperSize': 'Pappersstorlek',
    'selectPaperSize': 'Välj pappersstorlek',
    'orientation': 'Orientering',
    'portrait': 'Stående',
    'landscape': 'Liggande',
    'mapScale': 'Kartskala',
    'copies': 'Kopior',
    'include': 'Inkludera',
    'controlDescriptions': 'Kontrollbeskrivningar',
    'courseDetails': 'Bandetaljer',
    'cancel': 'Avbryt',
    'printArea': 'Utskriftsområde',
    'showCourses': 'Visa banor',
    'showControlNumbers': 'Visa kontrollnummer',
    'errorMapNotFound': 'Fel: Karta hittades inte',
    'myPurplePenProjects': 'Mina Purple Pen-projekt',
    'newProject': 'Nytt projekt',
    'previousProjects': 'Tidigare projekt',
    'viewManageProjects': 'Visa och hantera projekt'
  },
  en: {
    'routeGame': 'Route Choice Game',
    'courseSetter': 'Course Setter',
    'profile': 'Profile',
    'points': 'points',
    'routeChoose': 'Route Selector',
    'routeInstruction': 'Choose the correct direction for this route to earn points',
    'leaderboard': 'Leaderboard',
    'comingSoon': 'Coming Soon',
    'comingSoonDescription': 'New exciting features are on the way!',
    'orienteers': 'orienteers',
    'orienteeringEnthusiast': 'Orienteering Enthusiast',
    'rank': 'Rank',
    'yourStatistics': 'Your Statistics',
    'avgResponseTime': 'Average Response Time',
    'totalAttempts': 'Total Attempts',
    'accuracy': 'Accuracy',
    'correctChoices': 'Correct Choices',
    'incorrectChoices': 'Incorrect Choices',
    'you': 'you',
    'profileUpdated': 'Profile Updated',
    'profileUpdateSuccess': 'Your profile has been updated successfully',
    'invalidName': 'Invalid Name',
    'nameEmpty': 'Name cannot be empty',
    'excellent': 'Excellent!',
    'good': 'Good!',
    'correct': 'Correct!',
    'wrong': 'Wrong!',
    // Course Setter translations
    'newEvent': 'New Event',
    'myMaps': 'My Maps',
    'mapUploadedSuccessfully': 'Map uploaded successfully',
    'success': 'Success',
    'eventDate': 'Event Date',
    'previewMode': 'Preview Mode',
    'editMode': 'Edit Mode',
    'print': 'Print',
    'toggleLayers': 'Toggle Layers',
    'export': 'Export',
    'back': 'Back',
    'save': 'Save',
    'pointerTool': 'Pointer',
    'moveMap': 'Move Map',
    'addControl': 'Add Control',
    'addStart': 'Add Start',
    'addFinish': 'Add Finish',
    'zoomIn': 'Zoom In',
    'zoomOut': 'Zoom Out',
    'advancedTools': 'Advanced Tools',
    'crossingPoint': 'Crossing Point',
    'uncrossableBoundary': 'Uncrossable Boundary',
    'outOfBounds': 'Out of Bounds',
    'waterStation': 'Water Station',
    'resetView': 'Reset View',
    'printSettings': 'Print Settings',
    'configurePrintSettingsFor': 'Configure print settings for',
    'paperSize': 'Paper Size',
    'selectPaperSize': 'Select paper size',
    'orientation': 'Orientation',
    'portrait': 'Portrait',
    'landscape': 'Landscape',
    'mapScale': 'Map Scale',
    'copies': 'Copies',
    'include': 'Include',
    'controlDescriptions': 'Control Descriptions',
    'courseDetails': 'Course Details',
    'cancel': 'Cancel',
    'printArea': 'Print Area',
    'showCourses': 'Show Courses',
    'showControlNumbers': 'Show Control Numbers',
    'errorMapNotFound': 'Error: Map not found',
    'myPurplePenProjects': 'My Purple Pen Projects',
    'newProject': 'New Project',
    'previousProjects': 'Previous Projects',
    'viewManageProjects': 'View and manage projects'
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
