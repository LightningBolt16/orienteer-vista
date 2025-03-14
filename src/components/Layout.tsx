
import React from 'react';
import Header from './Header';
import { UserProvider } from '../context/UserContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <UserProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow pt-24 px-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
};

export default Layout;
