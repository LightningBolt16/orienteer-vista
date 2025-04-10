
import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import RouteGame from "./pages/RouteGame";
import CourseSetter from "./pages/CourseSetter";
import MyFiles from "./pages/MyFiles";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProjectManager from "./pages/ProjectManager";
import AuthPage from "./pages/AuthPage";
import Landing from "./components/Landing";
import { LanguageProvider } from "./context/LanguageContext";
import { UserProvider } from "./context/UserContext";

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React error boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border">
            <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h2>
            <p className="text-card-foreground mb-4">
              We encountered an error while rendering the application.
            </p>
            <pre className="bg-muted p-4 rounded overflow-auto text-xs mb-4">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Navigation error reset component
const NavigationErrorReset: React.FC = () => {
  const location = useLocation();
  const [key, setKey] = useState(0);
  
  // Reset error boundary on navigation
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [location.pathname]);
  
  return <ErrorBoundary key={key}>{location.children}</ErrorBoundary>;
};

// Check if Supabase is configured
const hasSupabaseConfig = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Development flag for local testing without Supabase
  const isDevelopmentMode = !hasSupabaseConfig();
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <UserProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {isDevelopmentMode ? (
                    // Development routes with Landing page
                    <>
                      <Route path="/" element={<Landing />} />
                      <Route path="/auth" element={<Landing />} />
                      <Route path="/route-game" element={<Layout><RouteGame /></Layout>} />
                      <Route path="/course-setter" element={<Layout><CourseSetter /></Layout>} />
                      <Route path="/my-files" element={<Layout><MyFiles /></Layout>} />
                      <Route path="/profile" element={<Layout><Profile /></Layout>} />
                      <Route path="/projects" element={<Layout><ProjectManager /></Layout>} />
                      <Route path="*" element={<Layout><NotFound /></Layout>} />
                    </>
                  ) : (
                    // Production routes with normal auth flow
                    <>
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/" element={<Layout><Index /></Layout>} />
                      <Route path="/route-game" element={<Layout><RouteGame /></Layout>} />
                      <Route path="/course-setter" element={<Layout><CourseSetter /></Layout>} />
                      <Route path="/my-files" element={<Layout><MyFiles /></Layout>} />
                      <Route path="/profile" element={<Layout><Profile /></Layout>} />
                      <Route path="/projects" element={<Layout><ProjectManager /></Layout>} />
                      <Route path="*" element={<Layout><NotFound /></Layout>} />
                    </>
                  )}
                </Routes>
              </BrowserRouter>
            </UserProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
