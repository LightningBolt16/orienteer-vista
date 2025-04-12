
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { UserProvider } from './context/UserContext';
import { Toaster } from './components/ui/toaster';
import { supabase } from './integrations/supabase/client';
import './App.css';

// Lazy-loaded components
const HomePage = lazy(() => import('./pages/Index'));
const Profile = lazy(() => import('./pages/Profile'));
const Auth = lazy(() => import('./pages/AuthPage'));
const ClubsPage = lazy(() => import('./pages/Clubs'));
const ClubDetailsPage = lazy(() => import('./pages/Club'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Initialize Supabase Storage bucket for profile images on app startup
const initializeStorage = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (!buckets?.find(bucket => bucket.name === 'profile_images')) {
    await supabase.storage.createBucket('profile_images', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024 // 5MB
    });
  }
};

// Initialize the app
initializeStorage();

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <UserProvider>
        <Router>
          <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div></div>}>
            <Routes>
              {routesConfig.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={<route.component />}
                />
              ))}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </UserProvider>
    </LanguageProvider>
  );
};

const routesConfig = [
  // Public routes
  { path: "/", component: HomePage },
  { path: "/auth", component: Auth },

  // User routes
  { path: "/profile", component: Profile },

  // Club routes
  { path: "/club/:id", component: ClubDetailsPage },
  { path: "/clubs", component: ClubsPage },
];

export default App;
