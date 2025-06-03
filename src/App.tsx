
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import RouteGame from "./pages/RouteGame";
import CourseSetter from "./pages/CourseSetter";
import MyFiles from "./pages/MyFiles";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProjectManager from "./pages/ProjectManager";
import AuthPage from "./pages/AuthPage";
import Subscription from "./pages/Subscription";
import { LanguageProvider } from "./context/LanguageContext";
import { UserProvider } from "./context/UserContext";
import { NetworkProvider } from "./context/NetworkContext";

// Initialize QueryClient with default settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NetworkProvider>
          <UserProvider>
            <LanguageProvider>
              <BrowserRouter>
                {/* Only render one of the toast providers at the app level */}
                <Toaster />
                {/* <SonnerToaster /> - Commented out to avoid conflicts */}
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/" element={<Layout><Index /></Layout>} />
                  <Route path="/route-game" element={<Layout><RouteGame /></Layout>} />
                  <Route path="/course-setter" element={<Layout><CourseSetter /></Layout>} />
                  <Route path="/my-files" element={<Layout><MyFiles /></Layout>} />
                  <Route path="/profile" element={<Layout><Profile /></Layout>} />
                  <Route path="/projects" element={<Layout><ProjectManager /></Layout>} />
                  <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
                  <Route path="*" element={<Layout><NotFound /></Layout>} />
                </Routes>
              </BrowserRouter>
            </LanguageProvider>
          </UserProvider>
        </NetworkProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
