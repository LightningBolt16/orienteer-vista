import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, User, Map, PenTool, FolderOpen, Medal, Menu, X, LogOut, LogIn, CreditCard } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getUserRank, signOut } = useUser();
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Helper for path checking with proper types
  const isCurrentPath = (path: string): boolean => {
    return location.pathname === path;
  };

  const isAuthenticated = user && user.id !== '1';

  // Connection status check
  const checkConnection = async () => {
    try {
      const { supabase } = await import('../integrations/supabase/client');
      
      const { error } = await supabase.from('user_profiles')
        .select('id')
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
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
        
        {isMobile ? (
          <>
            <div className="flex items-center space-x-4">
              {user?.attempts?.total !== undefined && user.attempts.total > 0 && (
                <Link to="/route-game" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {t('rank')} {getUserRank()}
                </Link>
              )}
              
              <LanguageSelector />
              
              <button 
                onClick={toggleMobileMenu}
                className="p-2 text-foreground"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
            
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
                  <span>{t('routeGame')}</span>
                </Link>
                
                <Link 
                  to="/course-setter" 
                  className={`p-3 rounded-md flex items-center space-x-2 ${
                    isCurrentPath('/course-setter') ? 'bg-muted text-orienteering' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PenTool className="h-5 w-5" />
                  <span>{t('courseSetter')}</span>
                </Link>
                
                <Link 
                  to="/my-files" 
                  className={`p-3 rounded-md flex items-center space-x-2 ${
                    isCurrentPath('/my-files') ? 'bg-muted text-orienteering' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FolderOpen className="h-5 w-5" />
                  <span>{t('myProjects')}</span>
                </Link>
                
                <Link 
                  to="/profile"
                  className="p-3 rounded-md flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>{t('profile')}</span>
                </Link>

                <Link 
                  to="/subscription" 
                  className="p-3 rounded-md flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>{t('subscription')}</span>
                </Link>

                {isAuthenticated ? (
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="p-3 rounded-md flex items-center space-x-2 text-red-500"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t('signOut')}</span>
                  </button>
                ) : (
                  <Link 
                    to="/auth"
                    className="p-3 rounded-md flex items-center space-x-2 text-orienteering"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="h-5 w-5" />
                    <span>{t('signIn')}</span>
                  </Link>
                )}
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
              <span>{t('routeGame')}</span>
            </Link>
            
            <Link 
              to="/course-setter" 
              className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                isCurrentPath('/course-setter') ? 'text-orienteering' : 'text-foreground'
              }`}
            >
              <PenTool className="h-4 w-4 mr-1" />
              <span>{t('courseSetter')}</span>
            </Link>
            
            <Link 
              to="/my-files" 
              className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                isCurrentPath('/my-files') ? 'text-orienteering' : 'text-foreground'
              }`}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              <span>{t('myProjects')}</span>
            </Link>
            
            <div className="flex items-center space-x-2 ml-4">
              {user?.attempts?.total !== undefined && user.attempts.total > 0 && (
                <Link to="/route-game" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {t('rank')} {getUserRank()}
                </Link>
              )}
              
              <LanguageSelector />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="transition-all-300 hover:brightness-110">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-orienteering" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{isAuthenticated ? user.name : t('guest')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t('profile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/subscription">{t('subscription')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('signOut')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/auth" className="text-orienteering">
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('signIn')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
