
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, User } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useUser();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
      scrolled ? 'glass-morphism shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover-scale">
          <Compass className="h-8 w-8 text-orienteering" />
          <span className="text-xl font-semibold tracking-tight">OrientVista</span>
        </Link>
        
        <nav className="flex items-center space-x-8">
          <Link 
            to="/" 
            className={`nav-link text-sm font-medium ${
              location.pathname === '/' ? 'text-orienteering' : 'text-foreground'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link text-sm font-medium ${
              location.pathname === '/profile' ? 'text-orienteering' : 'text-foreground'
            }`}
          >
            Profile
          </Link>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="rounded-full p-2 bg-orienteering/10 text-orienteering">
              {user?.points || 0} pts
            </div>
            <Link to="/profile" className="transition-all-300 hover:brightness-110">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-5 w-5 text-orienteering" />
              </div>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
