
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Reset error state on route change
  useEffect(() => {
    setError(null);
  }, [location.pathname]);

  // Error handling
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow pt-24 px-6 pb-6 flex items-center justify-center">
          <div className="glass-card p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="mb-4 text-muted-foreground">
              We encountered an error while rendering this page.
            </p>
            <div className="bg-muted p-4 rounded-md mb-6 overflow-auto">
              <pre className="text-sm">{error.message}</pre>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
              >
                Go home
              </button>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-24 px-6 pb-6">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
