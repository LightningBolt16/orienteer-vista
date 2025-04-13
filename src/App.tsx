
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { UserProvider } from './context/UserContext';
import { Toaster } from './components/ui/toaster';
import { supabase } from './integrations/supabase/client';
import AppLayout from './components/AppLayout';
import './App.css';

// Lazy-loaded components
const HomePage = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Auth = lazy(() => import('./pages/Auth'));
const ClubsPage = lazy(() => import('./pages/Clubs'));
const ClubDetailsPage = lazy(() => import('./pages/Club'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Initialize Supabase Storage bucket for profile images on app startup
const initializeStorage = async () => {
  try {
    // First check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error checking for bucket:', listError);
      return;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'profile_images');
    
    if (!bucketExists) {
      console.log('Creating profile_images bucket...');
      const { error: createError } = await supabase.storage.createBucket('profile_images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
      } else {
        console.log('profile_images bucket created successfully');
      }
    } else {
      console.log('profile_images bucket already exists');
    }
  } catch (error) {
    console.error('Unexpected error during storage initialization:', error);
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
              <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
              <Route path="/clubs" element={<AppLayout><ClubsPage /></AppLayout>} />
              <Route path="/club/:id" element={<AppLayout><ClubDetailsPage /></AppLayout>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </UserProvider>
    </LanguageProvider>
  );
};

export default App;
