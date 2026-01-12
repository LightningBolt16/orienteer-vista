import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, User, Map, PenTool, FolderOpen, Medal, Menu, X, LogOut, LogIn, CreditCard, Building2, Shield, Upload } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../hooks/useAdmin';
import { Loader2 } from 'lucide-react';
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
  const { user, getUserRank, signOut, leaderboard } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const { isAdmin } = useAdmin();
  
  // Get rank only if leaderboard is loaded
  const currentRank = leaderboard.length > 0 ? getUserRank() : 0;
  const hasValidRank = currentRank > 0;
  const isAuthenticated = user && user.id !== '1';
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


  // Connection status check
  const checkConnection = async () => {
    try {
      const { supabase } = await import('../integrations/supabase/client');
      
      const { error } = await (supabase.from('user_profiles' as any)
        .select('id')
        .limit(1) as any);
        
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
          <span className="text-xl font-semibold tracking-tight">Ljungdell.uk</span>
        </Link>
        
        {isMobile ? (
          <>
            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <Link to="/leaderboard" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {hasValidRank ? `#${currentRank}` : t('unranked') || 'Unranked'}
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
                  to="/clubs" 
                  className={`p-3 rounded-md flex items-center space-x-2 ${
                    isCurrentPath('/clubs') ? 'bg-muted text-orienteering' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="h-5 w-5" />
                  <span>{t('clubs')}</span>
                </Link>
                
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
                
                {isAuthenticated && (
                  <Link 
                    to="/my-maps"
                    className={`p-3 rounded-md flex items-center space-x-2 ${
                      isCurrentPath('/my-maps') ? 'bg-muted text-orienteering' : ''
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FolderOpen className="h-5 w-5" />
                    <span>{t('myMaps')}</span>
                  </Link>
                )}

                <Link 
                  to="/profile"
                  className="p-3 rounded-md flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>{t('profile')}</span>
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
                
                {isAdmin && (
                  <>
                    <Link 
                      to="/admin/club-requests"
                      className="p-3 rounded-md flex items-center space-x-2 text-yellow-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-5 w-5" />
                      <span>Club Requests</span>
                    </Link>
                    <Link 
                      to="/admin/pro-requests"
                      className="p-3 rounded-md flex items-center space-x-2 text-yellow-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-5 w-5" />
                      <span>Pro Requests</span>
                    </Link>
                    <Link 
                      to="/admin/upload-maps"
                      className="p-3 rounded-md flex items-center space-x-2 text-yellow-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Upload className="h-5 w-5" />
                      <span>Upload Maps</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <nav className="flex items-center space-x-8">
            <Link 
              to="/clubs" 
              className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                isCurrentPath('/clubs') ? 'text-orienteering' : 'text-foreground'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>{t('clubs')}</span>
            </Link>
            
            <Link 
              to="/route-game" 
              className={`nav-link text-sm font-medium flex items-center space-x-1 ${
                isCurrentPath('/route-game') ? 'text-orienteering' : 'text-foreground'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>{t('routeGame')}</span>
            </Link>
            
            
            <div className="flex items-center space-x-2 ml-4">
              {isAuthenticated && (
                <Link to="/leaderboard" className="rounded-full p-2 bg-orienteering/10 text-orienteering flex items-center hover:bg-orienteering/20 transition-colors">
                  <Medal className="h-4 w-4 mr-1" />
                  {hasValidRank ? `#${currentRank}` : t('unranked') || 'Unranked'}
                </Link>
              )}
              
              <LanguageSelector />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="transition-all-300 hover:brightness-110">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {isAuthenticated && user.profileImage ? (
                        <img 
                          src={user.profileImage} 
                          alt={user.name || 'Profile'} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-orienteering" />
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{isAuthenticated ? user.name : t('guest')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t('profile')}</Link>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    <DropdownMenuItem asChild>
                      <Link to="/my-maps">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {t('myMaps')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/club-requests" className="text-yellow-600">
                          <Shield className="h-4 w-4 mr-2" />
                          Club Requests
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/pro-requests" className="text-yellow-600">
                          <Shield className="h-4 w-4 mr-2" />
                          Pro Requests
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/upload-maps" className="text-yellow-600">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Maps
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
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
