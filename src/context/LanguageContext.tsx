
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
  const [language, setLanguage] = useState<string>('en');

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
      orienteers: 'Orienteers',
      you: 'You',
      
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
      orienteeringToolsPlatform: 'Orienteering tools platform',
      
      // Profile Page
      yourStatistics: 'Your Statistics',
      avgResponseTime: 'Average Response Time',
      totalAttempts: 'Total Attempts',
      correctChoices: 'Correct Choices',
      incorrectChoices: 'Incorrect Choices',
      orienteeringEnthusiast: 'Orienteering Enthusiast',
      invalidName: 'Invalid Name',
      nameEmpty: 'Name cannot be empty',
      profileUpdated: 'Profile Updated',
      profileUpdateSuccess: 'Your profile has been updated successfully',
      welcomeTo: 'Welcome to',
      authDescription: 'Sign in to your account or create a new one to track your progress',
      signingIn: 'Signing In',
      registering: 'Registering',
      authDisclaimer: 'By signing in, you agree to our Terms of Service and Privacy Policy',
      password: 'Password',
      fullName: 'Full Name',
      
      // My Files Page
      myPurplePenProjects: 'My Purple Pen Projects',
      previousProjects: 'Previous Projects',
      sharedProjects: 'Shared Projects',
      projectsSharedWithYou: 'Projects shared with you',
      viewManageProjects: 'View and manage your projects',
      collaborativeTools: 'Collaborative Tools',
      viewAll: 'View All',
      collaborateWithOthers: 'Collaborate with others on course setting projects',
      projectSharing: 'Project Sharing',
      shareCourseSettings: 'Share your course settings with others',
      manageSharing: 'Manage Sharing',
      trackDeadlines: 'Track project deadlines',
      viewCalendar: 'View Calendar',
      sharedWithMe: 'Shared with Me',
      myProjects: 'My Projects',
      
      // Coming Soon
      comingSoon: 'Coming Soon',
      designCourses: 'Design your own orienteering courses, share them with friends, and compete for the best times',
      getNotified: 'Get Notified',
      courseSettingTitle: 'Course Setting',
      
      // New Event Page
      newEvent: 'New Event',
      myMaps: 'My Maps',
      resetView: 'Reset View',
      
      // Subscription Page
      subscription: 'Subscription',
      pricingPlans: 'Pricing Plans',
      personalPlan: 'Personal Plan',
      clubPlan: 'Club Plan',
      personalPlanPrice: '200 kr / year',
      clubPlanPrice: '2500 kr / year',
      personalPlanDescription: 'Perfect for individual orienteers',
      clubPlanDescription: 'Ideal for orienteering clubs and teams',
      subscribe: 'Subscribe',
      personalPlanFeatures: 'Access to all route choice exercises, personal statistics tracking, and course setting tools',
      clubPlanFeatures: 'Everything in Personal Plan plus unlimited users, club-wide statistics, team management, and priority support',
      currentPlan: 'Current Plan',
      upgradePlan: 'Upgrade Plan',
      subscriptionDetails: 'Subscription Details',
      billingCycle: 'Billing Cycle',
      yearly: 'Yearly',
      nextBillingDate: 'Next Billing Date',
      manageBilling: 'Manage Billing',
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
