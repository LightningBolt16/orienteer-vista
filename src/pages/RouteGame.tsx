import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import RouteGameTutorial, { useRouteGameTutorial } from '../components/RouteGameTutorial';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import { useRouteCache } from '../context/RouteCache';
import { useUser } from '../context/UserContext';
import { MapSource, RouteData, getUniqueMapNames, loadUserMapRoutes } from '../utils/routeDataUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/use-toast';
import { AlertCircle, Map, Shuffle, Maximize2, Minimize2, LogIn, ArrowLeft, ChevronDown, ChevronUp, Lock, Users, MapPin, Star, Check, Layers } from 'lucide-react';
import PwtAttribution, { isPwtMap } from '@/components/PwtAttribution';
import kartkompanietLogo from '@/assets/kartkompaniet-logo.png';
import flagItaly from '@/assets/flag-italy.png';
import flagSweden from '@/assets/flag-sweden.png';
import flagBelgium from '@/assets/flag-belgium.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CommunityMapBrowser from '@/components/map/CommunityMapBrowser';
import { useCommunityFavorites } from '@/hooks/useCommunityFavorites';

type MapSelection = 'all' | string;
type MapCategory = 'official' | 'private' | 'community';

// Country code to flag image mapping for reliable cross-platform display
const COUNTRY_FLAG_IMAGES: Record<string, string> = {
  IT: flagItaly,
  SE: flagSweden,
  BE: flagBelgium,
};

// Storage URL for map logos
const LOGO_STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/map-logos`;

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { user, loading: userLoading } = useUser();
  const { desktopCache, mobileCache, isPreloading, getRoutesForMap, getUserRoutes, getCommunityRoutes, officialMaps, userMaps, communityMaps } = useRouteCache();
  const { showTutorial, closeTutorial } = useRouteGameTutorial();
  const { favorites, favoriteMaps, toggleFavorite, isFavorite, loading: favoritesLoading } = useCommunityFavorites();
  
  // Check for user map parameter
  const userMapId = searchParams.get('map');
  const isUserMapMode = !!userMapId;
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<MapSelection>('all');
  const [selectedMapCategory, setSelectedMapCategory] = useState<MapCategory>('official');
  const [selectedMap, setSelectedMap] = useState<MapSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [allMapsForRoutes, setAllMapsForRoutes] = useState<MapSource[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userMapName, setUserMapName] = useState<string>('');
  const [privateMapsOpen, setPrivateMapsOpen] = useState(false);
  const [communityMapsOpen, setCommunityMapsOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Get available maps from cache - only official maps for the main grid
  const cache = isMobile ? mobileCache : desktopCache;
  const availableMaps = cache?.maps || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);
  const uniqueUserMapNames = getUniqueMapNames(userMaps);
  // For community, only show favorited maps
  const uniqueFavoriteMapNames = favoriteMaps.map(m => m.name);

  const toggleFullscreen = useCallback(async () => {
    if (isMobile || !document.fullscreenEnabled) {
      setIsFullscreen(prev => !prev);
      return;
    }

    if (!gameContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await gameContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error, using CSS fallback:', error);
      setIsFullscreen(prev => !prev);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isMobile && document.fullscreenEnabled) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isMobile]);
  
  // Load user map routes if in user map mode
  useEffect(() => {
    if (!isUserMapMode || !userMapId) return;
    
    const loadUserRoutes = async () => {
      setIsLoading(true);
      try {
        const { routes, map, userMapName: mapName } = await loadUserMapRoutes(userMapId, isMobile);
        setRouteData(routes);
        setSelectedMap(map);
        setUserMapName(mapName);
        if (map) {
          setAllMapsForRoutes([map]);
        }
        
        if (routes.length === 0 && mapName) {
          toast({
            title: 'No routes available',
            description: 'This map has no routes generated yet, or processing is still in progress.',
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to load user map routes:', error);
        toast({
          title: t('error'),
          description: 'Failed to load routes for this map.',
          variant: "destructive"
        });
      }
      setIsLoading(false);
    };
    
    loadUserRoutes();
  }, [userMapId, isUserMapMode, isMobile, t]);

  // Load route data based on selection - uses cache (skip if in user map mode)
  useEffect(() => {
    if (isUserMapMode) return; // Skip for user map mode
    
    const loadRoutes = async () => {
      if (isPreloading) return;
      
      setIsLoading(true);
      
      try {
        let routes: RouteData[] = [];
        let maps: MapSource[] = [];
        
        if (selectedMapCategory === 'private') {
          // Load private map routes
          const result = await getUserRoutes(isMobile);
          routes = result.routes;
          maps = result.maps;
          
          if (selectedMapId !== 'all') {
            routes = routes.filter(r => r.mapName?.toLowerCase() === selectedMapId.toLowerCase());
          }
        } else if (selectedMapCategory === 'community') {
          // Load community map routes - filter by favorites when 'all' is selected
          if (selectedMapId === 'all') {
            // Random mix from all favorited community maps
            const favoriteMapIds = favoriteMaps.map(m => m.id);
            if (favoriteMapIds.length === 0) {
              routes = [];
              maps = [];
            } else {
              // Fetch routes for each favorited map and combine
              const allRoutes: RouteData[] = [];
              const allMaps: MapSource[] = [];
              for (const fav of favoriteMaps) {
                const result = await getCommunityRoutes(fav.name, isMobile);
                allRoutes.push(...result.routes);
                // Avoid duplicate maps
                result.maps.forEach(m => {
                  if (!allMaps.find(existing => existing.id === m.id)) {
                    allMaps.push(m);
                  }
                });
              }
              routes = allRoutes;
              maps = allMaps;
            }
          } else {
            const result = await getCommunityRoutes(selectedMapId, isMobile);
            routes = result.routes;
            maps = result.maps;
          }
        } else {
          // Load official map routes (default)
          const result = await getRoutesForMap(selectedMapId, isMobile);
          routes = result.routes;
          maps = result.maps;
        }
        
        setRouteData(routes);
        setAllMapsForRoutes(maps);
        
        if (selectedMapId !== 'all') {
          const mapSource = maps.find(m => m.name === selectedMapId);
          setSelectedMap(mapSource || null);
        } else {
          setSelectedMap(null);
        }
        
        if (routes.length === 0 && !isPreloading && selectedMapCategory === 'official') {
          toast({
            title: t('error'),
            description: t('noMapsAvailable'),
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to load route data:', error);
        toast({
          title: t('error'),
          description: t('errorLoadingPage'),
          variant: "destructive"
        });
      }
      
      setIsLoading(false);
    };
    
    loadRoutes();
  }, [selectedMapId, selectedMapCategory, isMobile, isPreloading, getRoutesForMap, getUserRoutes, getCommunityRoutes, t, isUserMapMode, favoriteMaps]);
  
  const handleMapSelect = (mapName: MapSelection) => {
    if (multiSelectMode && mapName !== 'all') {
      // Toggle selection in multi-select mode
      setSelectedMaps(prev => 
        prev.includes(mapName) 
          ? prev.filter(m => m !== mapName)
          : [...prev, mapName]
      );
    } else {
      // Single select mode - clear multi-select and set single map
      setMultiSelectMode(false);
      setSelectedMaps([]);
      setSelectedMapId(mapName);
    }
  };

  const toggleMultiSelectMode = () => {
    if (multiSelectMode) {
      // Exiting multi-select mode - clear selections
      setSelectedMaps([]);
    }
    setMultiSelectMode(!multiSelectMode);
  };

  const playSelectedMaps = async () => {
    if (selectedMaps.length === 0) return;
    
    setIsLoading(true);
    try {
      const allRoutes: RouteData[] = [];
      const allMaps: MapSource[] = [];
      
      // Load routes from each selected map based on current category
      for (const mapName of selectedMaps) {
        let result;
        if (selectedMapCategory === 'private') {
          result = await getUserRoutes(isMobile);
          result.routes = result.routes.filter(r => r.mapName?.toLowerCase() === mapName.toLowerCase());
        } else if (selectedMapCategory === 'community') {
          result = await getCommunityRoutes(mapName, isMobile);
        } else {
          result = await getRoutesForMap(mapName, isMobile);
        }
        
        allRoutes.push(...result.routes);
        result.maps.forEach(m => {
          if (!allMaps.find(existing => existing.id === m.id || existing.name === m.name)) {
            allMaps.push(m);
          }
        });
      }
      
      // Shuffle the combined routes for random mix
      const shuffledRoutes = [...allRoutes].sort(() => Math.random() - 0.5);
      
      setRouteData(shuffledRoutes);
      setAllMapsForRoutes(allMaps);
      setSelectedMap(null); // Multiple maps selected
      // Keep multi-select mode and selection visible so user knows what they're playing
      
      if (shuffledRoutes.length === 0) {
        toast({
          title: t('error'),
          description: 'No routes found in selected maps.',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to load multi-map routes:', error);
      toast({
        title: t('error'),
        description: 'Failed to load routes from selected maps.',
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleBackToPublicMaps = () => {
    navigate('/route-game');
  };

  // Show loading spinner while checking auth
  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  const showLoadingSpinner = isPreloading || isLoading;
  
  return (
    <div className="pb-20 space-y-8">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <RouteGameTutorial isMobile={isMobile} onClose={closeTutorial} />
      )}
      
      {/* Guest Mode Banner */}
      {!user && (
        <section className="max-w-4xl mx-auto">
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <span className="text-sm text-amber-800 dark:text-amber-200">
                {t('signInToSaveProgress') || 'Sign in to save your progress and appear on the leaderboard'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/auth')}
                className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t('signIn')}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* User Map Mode Header */}
      {isUserMapMode && (
        <section className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToPublicMaps}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div>
                  <h2 className="font-semibold">{userMapName || 'Your Map'}</h2>
                  <p className="text-sm text-muted-foreground">Playing on your uploaded map</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* Map Selection - Only show for public maps */}
      {!isUserMapMode && (
        <section className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t('selectMap')}</CardTitle>
              <CardDescription>{t('selectMapDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isPreloading ? (
                <div className="flex items-center p-4 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                  {t('loadingMaps')}
                </div>
              ) : uniqueMapNames.length > 0 ? (
                <div className="space-y-6">
                  {/* Multi-Select Toggle and Play Button */}
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant={multiSelectMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleMultiSelectMode}
                      className="gap-2"
                    >
                      <Layers className="h-4 w-4" />
                      {multiSelectMode ? 'Cancel Multi-Select' : 'Multi-Select'}
                    </Button>
                    
                    {multiSelectMode && selectedMaps.length > 0 && (
                      <Button
                        onClick={playSelectedMaps}
                        className="gap-2 bg-primary"
                      >
                        <Shuffle className="h-4 w-4" />
                        Play {selectedMaps.length} Map{selectedMaps.length > 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>

                  {multiSelectMode && (
                    <p className="text-sm text-muted-foreground">
                      Click maps to select them, then press "Play" to combine their routes into a random mix.
                    </p>
                  )}

                  {/* Official Maps Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {/* All Maps Option - Only show when not in multi-select mode */}
                    {!multiSelectMode && (
                      <button
                        onClick={() => { handleMapSelect('all'); setSelectedMapCategory('official'); }}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                          selectedMapId === 'all' && selectedMapCategory === 'official'
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card'
                        }`}
                      >
                        <Shuffle className="h-8 w-8 mb-2 text-primary" />
                        <span className="font-medium text-sm">All Maps</span>
                        <span className="text-xs text-muted-foreground">Random mix</span>
                      </button>
                    )}
                    
                    {/* Individual Map Options */}
                    {uniqueMapNames.map(mapName => {
                      const mapSource = availableMaps.find(m => m.name === mapName);
                      const countryCode = mapSource?.countryCode;
                      const logoPath = mapSource?.logoPath;
                      const isPwt = isPwtMap(mapName);
                      const isKnivsta = mapName.toLowerCase().includes('knivsta');
                      const isEkeby = mapName.toLowerCase().includes('ekeby');
                      const flagImage = countryCode ? COUNTRY_FLAG_IMAGES[countryCode] : null;
                      const showKartkompanietLogo = isKnivsta || isEkeby;
                      const customLogoUrl = logoPath ? `${LOGO_STORAGE_URL}/${logoPath}` : null;
                      const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                      const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'official';
                      
                      return (
                        <button
                          key={mapName}
                          onClick={() => { handleMapSelect(mapName); if (!multiSelectMode) setSelectedMapCategory('official'); }}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                            isMultiSelected || isSingleSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card'
                          }`}
                        >
                          {/* Multi-select checkmark */}
                          {multiSelectMode && isMultiSelected && (
                            <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          {flagImage && (
                            <img src={flagImage} alt={countryCode} className="absolute top-1 right-1 w-5 h-4 object-cover rounded-sm shadow-sm" />
                          )}
                          {isPwt ? (
                            <PwtAttribution variant="badge" className="mb-2" />
                          ) : customLogoUrl ? (
                            <img src={customLogoUrl} alt={`${mapName} logo`} className="h-8 w-8 mb-2 object-contain rounded" />
                          ) : showKartkompanietLogo ? (
                            <img src={kartkompanietLogo} alt="Kartkompaniet" className="h-8 w-8 mb-2 object-contain" />
                          ) : (
                            <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">{mapName}</span>
                          <span className="text-xs text-muted-foreground">{mapSource?.description || 'Orienteering map'}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Your Private Maps - Collapsible */}
                  {user && (
                    <Collapsible open={privateMapsOpen} onOpenChange={setPrivateMapsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Your Private Maps</span>
                            <span className="text-xs text-muted-foreground">({uniqueUserMapNames.length})</span>
                          </div>
                          {privateMapsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <div className="p-3 mb-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <Lock className="h-3 w-3 inline mr-1" />
                            Stats from these maps are private and won't affect the public leaderboard.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {/* Random Mix for Private Maps - hide in multi-select mode */}
                          {!multiSelectMode && uniqueUserMapNames.length > 1 && (
                            <button
                              onClick={() => { handleMapSelect('all'); setSelectedMapCategory('private'); }}
                              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                                selectedMapId === 'all' && selectedMapCategory === 'private'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border bg-card'
                              }`}
                            >
                              <Shuffle className="h-8 w-8 mb-2 text-primary" />
                              <span className="font-medium text-sm">Random Mix</span>
                              <span className="text-xs text-muted-foreground">All your maps</span>
                            </button>
                          )}
                          {uniqueUserMapNames.map(mapName => {
                            const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                            const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'private';
                            return (
                              <button
                                key={mapName}
                                onClick={() => { handleMapSelect(mapName); if (!multiSelectMode) setSelectedMapCategory('private'); }}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                                  isMultiSelected || isSingleSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                                }`}
                              >
                                {/* Multi-select checkmark */}
                                {multiSelectMode && isMultiSelected && (
                                  <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                )}
                                <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                                <span className="font-medium text-sm">{mapName}</span>
                                <span className="text-xs text-muted-foreground">Private</span>
                              </button>
                            );
                          })}
                          <button
                            onClick={() => navigate('/my-maps')}
                            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-primary/40 transition-all hover:border-primary hover:bg-primary/5"
                          >
                            <Map className="h-8 w-8 mb-2 text-primary" />
                            <span className="font-medium text-sm text-primary">Upload New</span>
                          </button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Community Maps - Collapsible */}
                  <Collapsible open={communityMapsOpen} onOpenChange={setCommunityMapsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Community Maps</span>
                          <span className="text-xs text-muted-foreground">
                            ({uniqueFavoriteMapNames.length} favorite{uniqueFavoriteMapNames.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {communityMapsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="p-3 mb-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <Star className="h-3 w-3 inline mr-1 fill-yellow-400 text-yellow-400" />
                          Star maps from the browser below to add them here. Stats go to map-specific leaderboards.
                        </p>
                      </div>
                      
                      {/* Map Browser */}
                      <div className="mb-4">
                        <CommunityMapBrowser 
                          onSelectMap={(mapName) => { 
                            handleMapSelect(mapName); 
                            setSelectedMapCategory('community'); 
                          }}
                          selectedMapName={selectedMapCategory === 'community' ? (selectedMapId === 'all' ? undefined : selectedMapId) : undefined}
                          favorites={favorites}
                          onToggleFavorite={toggleFavorite}
                        />
                      </div>
                      
                      {uniqueFavoriteMapNames.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {/* Random Mix for Favorited Community Maps - hide in multi-select mode */}
                          {!multiSelectMode && uniqueFavoriteMapNames.length > 1 && (
                            <button
                              onClick={() => { handleMapSelect('all'); setSelectedMapCategory('community'); }}
                              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                                selectedMapId === 'all' && selectedMapCategory === 'community'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border bg-card'
                              }`}
                            >
                              <Shuffle className="h-8 w-8 mb-2 text-primary" />
                              <span className="font-medium text-sm">Random Mix</span>
                              <span className="text-xs text-muted-foreground">From favorites</span>
                            </button>
                          )}
                          {uniqueFavoriteMapNames.map(mapName => {
                            const mapSource = communityMaps.find(m => m.name === mapName);
                            const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                            const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'community';
                            const logoUrl = mapSource?.logoPath ? `${LOGO_STORAGE_URL}/${mapSource.logoPath}` : null;
                            return (
                              <button
                                key={mapName}
                                onClick={() => { handleMapSelect(mapName); if (!multiSelectMode) setSelectedMapCategory('community'); }}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                                  isMultiSelected || isSingleSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                                }`}
                              >
                                {/* Multi-select checkmark */}
                                {multiSelectMode && isMultiSelected && (
                                  <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                )}
                                <Star className="absolute top-1 right-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {logoUrl ? (
                                  <img 
                                    src={logoUrl} 
                                    alt={`${mapName} logo`} 
                                    className="h-8 w-8 mb-2 object-contain rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <Users className={`h-8 w-8 mb-2 text-muted-foreground ${logoUrl ? 'hidden' : ''}`} />
                                <span className="font-medium text-sm">{mapName}</span>
                                {mapSource?.locationName ? (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-full">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{mapSource.locationName.split(',')[0]}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Community</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No favorites yet. Use the map browser above to star community maps you want to practice on.
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : (
                <div className="flex items-center p-4 text-sm text-amber-800 border border-amber-200 rounded-md bg-amber-50">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  <span>{t('noMapsAvailable')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* Route Selector Section */}
      {showLoadingSpinner ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : routeData.length > 0 && (
        <section className={isFullscreen ? 'fixed inset-0 z-50' : 'max-w-4xl mx-auto'}>
          <div 
            ref={gameContainerRef}
            className={`relative ${isFullscreen ? 'bg-black h-full w-full' : ''}`}
          >
            {/* Fullscreen Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className={`absolute z-20 ${isFullscreen ? 'top-4 right-4 bg-black/50 border-white/30 hover:bg-black/70' : 'top-2 right-2'}`}
              title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <div className={isFullscreen ? 'h-full w-full' : ''}>
              {isMobile ? (
                <MobileRouteSelector 
                  routeData={routeData} 
                  mapSource={selectedMap}
                  allMaps={allMapsForRoutes}
                  isFullscreen={isFullscreen}
                />
              ) : (
                <RouteSelector 
                  routeData={routeData} 
                  mapSource={selectedMap}
                  allMaps={allMapsForRoutes}
                  isFullscreen={isFullscreen}
                />
              )}
            </div>
          </div>
        </section>
      )}
      
      {/* Toggle Leaderboard Button */}
      {!isFullscreen && (
        <div className="flex justify-center">
          <Button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="bg-orienteering hover:bg-orienteering/90"
          >
            {showLeaderboard ? t('routeChoose') : t('leaderboard')}
          </Button>
        </div>
      )}
      
      {/* Leaderboard Section */}
      {showLeaderboard && !isFullscreen && (
        <section className="max-w-2xl mx-auto animate-fade-in">
          <Leaderboard showAll={true} />
        </section>
      )}

      {/* PWT Attribution Footer */}
      {!isFullscreen && (
        <section className="max-w-lg mx-auto">
          <PwtAttribution variant="footer" />
        </section>
      )}
    </div>
  );
};

export default RouteGame;
