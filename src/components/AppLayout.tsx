
import React from 'react';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      <div className="pt-24 container mx-auto px-4">
        {children}
      </div>
    </>
  );
};

export default AppLayout;
