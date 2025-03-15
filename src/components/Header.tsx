
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, User, Globe, Map, PenTool, FolderOpen, Medal, Menu, X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, getUserRank } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Helper for path checking with proper types
  const isCurrentPath = (path: string): boolean => {
    return location.pathname === path;
  };

  const isCourseSetter = isCurrentPath('/course-setter') || isCurrentPath('/my-files');

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
      scrolled ? 'glass-morphism shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover-scale">
          <Compass className="h-8 w-8 text-orienteering" />
          <span className="text-xl font-semibold tracking-tight">OL.se</span>
        </Link>
        
        {isMobile ? (
          <>
            <div className="flex items-center space-x-4">
              {user?.attempts?.total !== undefined && user.attempts.total > 0 && (
                <Link to="/route-game" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {t('rank')} {getUserRank()}
                </Link>
              )}
              
              <button 
                onClick={toggleMobileMenu}
                className="p-2 text-foreground"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
            
            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-sm shadow-lg p-4 flex flex-col space-y-4 animate-fade-in">
                <Link 
                  to="/route-game" 
                  className={`p-3 rounded-md flex items-center space-x-2 ${
                    isCurrentPath('/route-game') ? 'bg-muted text-orienteering' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Map className="h-5 w-5" />
                  <span>{t('route.game')}</span>
                </Link>
                
                <button 
                  onClick={() => {
                    toggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-md flex items-center space-x-2"
                >
                  <Globe className="h-5 w-5" />
                  <span>{language === 'sv' ? 'EN' : 'SV'}</span>
                </button>
                
                <Link 
                  to="/profile"
                  className="p-3 rounded-md flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>{t('profile')}</span>
                </Link>
              </div>
            )}
          </>
        ) : (
          <nav className="flex items-center space-x-8">
            <Link 
              to="/route-game" 
              className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                isCurrentPath('/route-game') ? 'text-orienteering' : 'text-foreground'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>{t('route.game')}</span>
            </Link>
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                      isCourseSetter ? 'text-orienteering' : 'text-foreground'
                    }`}
                  >
                    <PenTool className="h-4 w-4 mr-1" />
                    <span>{t('course.setter')}</span>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-[8rem]">
                    <div className="grid gap-2 p-2">
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/course-setter" 
                          className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted ${
                            isCurrentPath('/course-setter') ? 'bg-muted' : ''
                          }`}
                        >
                          <PenTool className="h-4 w-4" />
                          <span>{t('course.setter')}</span>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link 
                          to="/my-files" 
                          className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted ${
                            isCurrentPath('/my-files') ? 'bg-muted' : ''
                          }`}
                        >
                          <FolderOpen className="h-4 w-4" />
                          <span>{t('my.files')}</span>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            
            <button 
              onClick={toggleLanguage}
              className="text-sm font-medium nav-link flex items-center space-x-1"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'sv' ? 'EN' : 'SV'}</span>
            </button>
            
            <div className="flex items-center space-x-2 ml-4">
              {user?.attempts?.total !== undefined && user.attempts.total > 0 && (
                <Link to="/route-game" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {t('rank')} {getUserRank()}
                </Link>
              )}
              <Link to="/profile" className="transition-all-300 hover:brightness-110">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-5 w-5 text-orienteering" />
                </div>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
