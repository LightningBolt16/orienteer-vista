
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string, vars?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<string>(localStorage.getItem('language') || 'en');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const translations: { [key: string]: { [key: string]: string } } = {
    en: {
      // Navigation & Common Elements
      routeGame: 'Route Game',
      courseSetter: 'Course Setter',
      signIn: 'Sign In',
      register: 'Register',
      projectManager: 'Project Manager',
      projectsList: 'Projects List',
      calendar: 'Calendar',
      newProject: 'New Project',
      noCategories: 'No Categories',
      allCategories: 'All Categories',
      selectedCategories: 'Selected Categories ({count})',
      training: 'Training',
      club: 'Club',
      national: 'National',
      other: 'Other',
      dueDate: 'Due Date',
      share: 'Share',
      edit: 'Edit',
      sharedWith: 'Shared With',
      noProjects: 'No Projects',
      createYourFirstProject: 'Create your first project',
      createProject: 'Create Project',
      projectCalendar: 'Project Calendar',
      viewUpcomingDeadlines: 'View upcoming deadlines',
      createNewProject: 'Create New Project',
      fillProjectDetails: 'Fill in the project details',
      projectName: 'Project Name',
      enterProjectName: 'Enter project name',
      description: 'Description',
      enterDescription: 'Enter description',
      category: 'Category',
      selectCategory: 'Select category',
      cancel: 'Cancel',
      projectCreated: 'Project created',
      hasBeenCreated: 'has been created',
      shareProject: 'Share Project',
      shareProjectDescription: 'Share this project with others',
      email: 'Email',
      name: 'Name',
      permission: 'Permission',
      selectPermission: 'Select a permission',
      canView: 'Can View',
      canSuggest: 'Can Suggest',
      canEdit: 'Can Edit',
      enterName: 'Enter name',
      sharingPermissionUpdated: 'Sharing permission updated',
      accessRemoved: 'Access removed',
      userAccessRemoved: 'User access removed',
      projectDetails: 'Project Details',
      assignee: 'Assignee',
      noDescription: 'No description',
      projectShared: 'Project shared',
      projectSharedWith: 'Project shared with',
      
      // Authentication
      error: 'Error',
      emailRequired: 'Email is required',
      invalidEmail: 'Invalid email address',
      signInError: 'Sign In Error',
      signUpError: 'Sign Up Error',
      verifyEmail: 'Verify Email',
      verifyEmailDescription: 'Please check your email to verify your account',
      signOutError: 'Sign Out Error',
      signInRequired: 'Sign in required',
      profile: 'Profile',
      guest: 'Guest',
      signOut: 'Sign Out',
      
      // Route Game
      excellent: 'Excellent',
      good: 'Good',
      correct: 'Correct',
      wrong: 'Wrong',
      routeChoiceGame: 'Route Choice Game',
      pickFastestRoute: 'Pick the fastest route',
      howToPlay: 'How to Play',
      routeChoiceExplanation: 'Look at the orienteering map and select the shortest route between two control points',
      useArrowKeys: 'Use arrow keys or touch the sides of the screen to select',
      yourPerformance: 'Your Performance',
      accuracy: 'Accuracy',
      speed: 'Speed',
      leaderboard: 'Leaderboard',
      rank: 'Rank',
      selectMap: 'Select Map',
      selectMapDescription: 'Choose a map to practice route choices on',
      selectMapPlaceholder: 'Select a map for route choices',
      loadingMaps: 'Loading maps',
      noMapsAvailable: 'No maps available for your device',
      routeChoose: 'Choose Routes',
      
      // Course Setter
      mapLibrary: 'Map Library',
      uploadMap: 'Upload Map',
      newCourse: 'New Course',
      maps: 'Maps',
      courses: 'Courses',
      createEvent: 'Create Event',
      eventDate: 'Event Date',
      selectMapFirst: 'Select a map first',
      enterEventName: 'Enter event name',
      mapScale: 'Map Scale',
      mapType: 'Map Type',
      sprintMap: 'Sprint Map',
      forestMap: 'Forest Map',
      eventName: 'Event Name',
      createCourse: 'Create Course',
      courseName: 'Course Name',
      controls: 'Controls',
      controlFeatures: 'Control Features',
      printSettings: 'Print Settings',
      toggleLayers: 'Toggle Layers',
      export: 'Export',
      print: 'Print',
      enterFullscreen: 'Enter Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      back: 'Back',
      save: 'Save',
      previewMode: 'Preview Mode',
      editMode: 'Edit Mode',
      myMaps: 'My Maps',
      resetView: 'Reset View',
      
      // Map Storage
      mapUploaded: 'Map uploaded successfully',
      mapDeleted: 'Map deleted successfully',
      success: 'Success',
      
      // Course Tools
      pointerTool: 'Pointer Tool',
      moveMap: 'Move Map',
      addControl: 'Add Control',
      addStart: 'Add Start',
      addFinish: 'Add Finish',
      crossingPoint: 'Crossing Point',
      uncrossableBoundary: 'Uncrossable Boundary',
      outOfBounds: 'Out of Bounds',
      waterStation: 'Water Station',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      advancedTools: 'Advanced Tools',
      
      // Index Page
      improvementText: 'Improve your route choice skills, create courses, and analyze your performance with our orienteering tools',
      routeChoiceChampions: 'Route Choice Champions',
      competeWithOthers: 'Compete with other orienteers worldwide. See who makes the best route choices in the shortest time',
      joinCompetition: 'Join the competition',
      createCourses: 'Create and design your own courses',
      testImproveSkills: 'Test and improve your route choice skills',
      orienteeringTools: 'Orienteering Tools for Everyone',
      loadingPage: 'Loading Page',
      errorLoadingPage: 'Error Loading Page',
      reloadPage: 'Reload Page',
      version: 'Version 1.0.0',
      
      // Configuration
      configurationRequired: 'Configuration Required',
      supabaseConnectionMessage: 'Please connect to Supabase using the Lovable integration to enable user authentication',
      learnMore: 'Learn more',
      environmentVariables: 'Check your environment variables and Supabase connection',
      
      // Development Info
      developmentMode: 'Development Mode Active',
      developmentModeInfo: 'User authentication is currently in development mode. Use the Supabase integration to enable real authentication',
      orienteeringToolsPlatform: 'Orienteering tools platform'
    },
    se: {
      // Navigation & Common Elements
      routeGame: 'Vägvalsträning',
      courseSetter: 'Banläggare',
      signIn: 'Logga In',
      register: 'Registrera',
      projectManager: 'Projekthanterare',
      projectsList: 'Projektlista',
      calendar: 'Kalender',
      newProject: 'Nytt Projekt',
      noCategories: 'Inga Kategorier',
      allCategories: 'Alla Kategorier',
      selectedCategories: 'Valda Kategorier ({count})',
      training: 'Träning',
      club: 'Klubb',
      national: 'Nationell',
      other: 'Annat',
      dueDate: 'Förfallodatum',
      share: 'Dela',
      edit: 'Redigera',
      sharedWith: 'Delad Med',
      noProjects: 'Inga Projekt',
      createYourFirstProject: 'Skapa ditt första projekt',
      createProject: 'Skapa Projekt',
      projectCalendar: 'Projektkalender',
      viewUpcomingDeadlines: 'Visa kommande deadlines',
      createNewProject: 'Skapa Nytt Projekt',
      fillProjectDetails: 'Fyll i projektinformationen',
      projectName: 'Projektnamn',
      enterProjectName: 'Ange projektnamn',
      description: 'Beskrivning',
      enterDescription: 'Ange beskrivning',
      category: 'Kategori',
      selectCategory: 'Välj kategori',
      cancel: 'Avbryt',
      projectCreated: 'Projekt skapat',
      hasBeenCreated: 'har skapats',
      shareProject: 'Dela Projekt',
      shareProjectDescription: 'Dela detta projekt med andra',
      email: 'E-post',
      name: 'Namn',
      permission: 'Behörighet',
      selectPermission: 'Välj en behörighet',
      canView: 'Kan Visa',
      canSuggest: 'Kan Föreslå',
      canEdit: 'Kan Redigera',
      enterName: 'Ange namn',
      sharingPermissionUpdated: 'Delningsbehörighet uppdaterad',
      accessRemoved: 'Åtkomst borttagen',
      userAccessRemoved: 'Användaråtkomst borttagen',
      projectDetails: 'Projektinformation',
      assignee: 'Tilldelad',
      noDescription: 'Ingen beskrivning',
      projectShared: 'Projekt delat',
      projectSharedWith: 'Projekt delat med',
      
      // Authentication
      error: 'Fel',
      emailRequired: 'E-post krävs',
      invalidEmail: 'Ogiltig e-postadress',
      signInError: 'Inloggningsfel',
      signUpError: 'Registreringsfel',
      verifyEmail: 'Verifiera E-post',
      verifyEmailDescription: 'Vänligen kontrollera din e-post för att verifiera ditt konto',
      signOutError: 'Utloggningsfel',
      signInRequired: 'Inloggning krävs',
      profile: 'Profil',
      guest: 'Gäst',
      signOut: 'Logga Ut',
      
      // Route Game
      excellent: 'Utmärkt',
      good: 'Bra',
      correct: 'Korrekt',
      wrong: 'Fel',
      routeChoiceGame: 'Vägvalsträning',
      pickFastestRoute: 'Välj den snabbaste vägen',
      howToPlay: 'Hur man spelar',
      routeChoiceExplanation: 'Titta på orienteringskartan och välj den kortaste vägen mellan två kontroller',
      useArrowKeys: 'Använd piltangenterna eller tryck på sidorna av skärmen för att välja',
      yourPerformance: 'Din prestation',
      accuracy: 'Träffsäkerhet',
      speed: 'Hastighet',
      leaderboard: 'Topplista',
      rank: 'Plats',
      selectMap: 'Välj Karta',
      selectMapDescription: 'Välj en karta att träna vägval på',
      selectMapPlaceholder: 'Välj en karta för vägval',
      loadingMaps: 'Laddar kartor',
      noMapsAvailable: 'Inga kartor tillgängliga för din enhet',
      routeChoose: 'Välj Vägval',
      
      // Course Setter
      mapLibrary: 'Kartbibliotek',
      uploadMap: 'Ladda upp karta',
      newCourse: 'Ny bana',
      maps: 'Kartor',
      courses: 'Banor',
      createEvent: 'Skapa tävling',
      eventDate: 'Tävlingsdatum',
      selectMapFirst: 'Välj en karta först',
      enterEventName: 'Ange tävlingsnamn',
      mapScale: 'Kartskala',
      mapType: 'Karttyp',
      sprintMap: 'Sprintkarta',
      forestMap: 'Skogskarta',
      eventName: 'Tävlingsnamn',
      createCourse: 'Skapa bana',
      courseName: 'Bannamn',
      controls: 'Kontroller',
      controlFeatures: 'Kontrolldetaljer',
      printSettings: 'Utskriftsinställningar',
      toggleLayers: 'Växla lager',
      export: 'Exportera',
      print: 'Skriv ut',
      enterFullscreen: 'Fullskärm',
      exitFullscreen: 'Avsluta fullskärm',
      back: 'Tillbaka',
      save: 'Spara',
      previewMode: 'Förhandsvisning',
      editMode: 'Redigeringsläge',
      myMaps: 'Mina Kartor',
      resetView: 'Återställ vy',
      
      // Map Storage
      mapUploaded: 'Karta uppladdad',
      mapDeleted: 'Karta raderad',
      success: 'Klart',
      
      // Course Tools
      pointerTool: 'Pekarverktyg',
      moveMap: 'Flytta Karta',
      addControl: 'Lägg till kontroll',
      addStart: 'Lägg till start',
      addFinish: 'Lägg till mål',
      crossingPoint: 'Passagepunkt',
      uncrossableBoundary: 'Opasserbar gräns',
      outOfBounds: 'Förbjudet område',
      waterStation: 'Vätskekontroll',
      zoomIn: 'Zooma in',
      zoomOut: 'Zooma ut',
      advancedTools: 'Avancerade verktyg',
      
      // Index Page
      improvementText: 'Förbättra dina vägval, skapa banor och analysera din prestation med våra orienteringsverktyg',
      routeChoiceChampions: 'Vägvalsmästare',
      competeWithOthers: 'Tävla med andra orienterare världen över. Se vem som gör de bästa vägvalen på kortast tid',
      joinCompetition: 'Delta i tävlingen',
      createCourses: 'Skapa och designa dina egna banor',
      testImproveSkills: 'Testa och förbättra dina vägvalsförmågor',
      orienteeringTools: 'Orienteringsverktyg för alla',
      loadingPage: 'Laddar sida',
      errorLoadingPage: 'Fel vid laddning av sidan',
      reloadPage: 'Ladda om sidan',
      version: 'Version 1.0.0',
      
      // Configuration
      configurationRequired: 'Konfiguration krävs',
      supabaseConnectionMessage: 'Anslut till Supabase med Lovable-integrationen för att aktivera användarautentisering',
      learnMore: 'Läs mer',
      environmentVariables: 'Kontrollera dina miljövariabler och Supabase-anslutning',
      
      // Development Info
      developmentMode: 'Utvecklingsläge aktivt',
      developmentModeInfo: 'Användarautentisering är för närvarande i utvecklingsläge. Använd Supabase-integrationen för att aktivera äkta autentisering',
      orienteeringToolsPlatform: 'Plattform för orienteringsverktyg'
    },
  };

  const t = (key: string, vars: { [key: string]: string | number } = {}) => {
    let translation = translations[language]?.[key] || key;
    
    Object.keys(vars).forEach(key => {
      translation = translation.replace(`{${key}}`, String(vars[key]));
    });

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
