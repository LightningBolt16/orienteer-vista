
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
import LeaderboardPage from "./pages/LeaderboardPage";
import UserProfile from "./pages/UserProfile";
import ClubsPage from "./pages/ClubsPage";
import ClubDetailPage from "./pages/ClubDetailPage";
import AdminClubRequests from "./pages/AdminClubRequests";
import { LanguageProvider } from "./context/LanguageContext";
import { UserProvider } from "./context/UserContext";
import { NetworkProvider } from "./context/NetworkContext";
import { RouteCacheProvider } from "./context/RouteCache";

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
              <RouteCacheProvider>
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
                    <Route path="/leaderboard" element={<Layout><LeaderboardPage /></Layout>} />
                    <Route path="/user/:userId" element={<Layout><UserProfile /></Layout>} />
                    <Route path="/clubs" element={<Layout><ClubsPage /></Layout>} />
                    <Route path="/clubs/:clubId" element={<Layout><ClubDetailPage /></Layout>} />
                    <Route path="/admin/club-requests" element={<Layout><AdminClubRequests /></Layout>} />
                    <Route path="*" element={<Layout><NotFound /></Layout>} />
                  </Routes>
                </BrowserRouter>
              </RouteCacheProvider>
            </LanguageProvider>
          </UserProvider>
        </NetworkProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
