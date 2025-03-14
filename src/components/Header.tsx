
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, User, Globe, Map, PenTool } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useUser();
  const { language, setLanguage, t } = useLanguage();
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

  const toggleLanguage = () => {
    setLanguage(language === 'sv' ? 'en' : 'sv');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
      scrolled ? 'glass-morphism shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover-scale">
          <Compass className="h-8 w-8 text-orienteering" />
          <span className="text-xl font-semibold tracking-tight">OL.se</span>
        </Link>
        
        <nav className="flex items-center space-x-8">
          <Link 
            to="/route-game" 
            className={`nav-link text-sm font-medium flex items-center space-x-1 ${
              location.pathname === '/route-game' ? 'text-orienteering' : 'text-foreground'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>{t('route.game')}</span>
          </Link>
          <Link 
            to="/course-setter" 
            className={`nav-link text-sm font-medium flex items-center space-x-1 ${
              location.pathname === '/course-setter' ? 'text-orienteering' : 'text-foreground'
            }`}
          >
            <PenTool className="h-4 w-4" />
            <span>{t('course.setter')}</span>
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link text-sm font-medium ${
              location.pathname === '/profile' ? 'text-orienteering' : 'text-foreground'
            }`}
          >
            {t('profile')}
          </Link>
          
          <button 
            onClick={toggleLanguage}
            className="text-sm font-medium nav-link flex items-center space-x-1"
          >
            <Globe className="h-4 w-4" />
            <span>{language === 'sv' ? 'EN' : 'SV'}</span>
          </button>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="rounded-full p-2 bg-orienteering/10 text-orienteering">
              {user?.points || 0} {t('points')}
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
