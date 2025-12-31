import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import RouteGameTutorial, { useRouteGameTutorial } from '../components/RouteGameTutorial';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import { useRouteCache } from '../context/RouteCache';
import { useUser } from '../context/UserContext';
import { MapSource, RouteData, getUniqueMapNames } from '../utils/routeDataUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/use-toast';
import { AlertCircle, Map, Shuffle, Maximize2, Minimize2, LogIn } from 'lucide-react';
import PwtAttribution, { isPwtMap } from '@/components/PwtAttribution';

type MapSelection = 'all' | string;

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: userLoading } = useUser();
  const { desktopCache, mobileCache, isPreloading, getRoutesForMap } = useRouteCache();
  const { showTutorial, closeTutorial } = useRouteGameTutorial();
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<MapSelection>('all');
  const [selectedMap, setSelectedMap] = useState<MapSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [allMapsForRoutes, setAllMapsForRoutes] = useState<MapSource[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Get available maps from cache
  const cache = isMobile ? mobileCache : desktopCache;
  const availableMaps = cache?.maps || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);

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
  
  // Load route data based on selection - uses cache
  useEffect(() => {
    const loadRoutes = async () => {
      if (isPreloading) return;
      
      setIsLoading(true);
      
      try {
        const { routes, maps } = await getRoutesForMap(selectedMapId, isMobile);
        setRouteData(routes);
        setAllMapsForRoutes(maps);
        
        if (selectedMapId !== 'all') {
          const aspect = isMobile ? '9:16' : '16:9';
          const mapSource = maps.find(m => m.name === selectedMapId && m.aspect === aspect);
          setSelectedMap(mapSource || null);
        } else {
          setSelectedMap(null);
        }
        
        if (routes.length === 0 && !isPreloading) {
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
  }, [selectedMapId, isMobile, isPreloading, getRoutesForMap, t]);
  
  const handleMapSelect = (mapName: MapSelection) => {
    setSelectedMapId(mapName);
  };

  // Show login prompt if not authenticated
  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <LogIn className="h-6 w-6" />
              {t('loginRequired')}
            </CardTitle>
            <CardDescription>
              {t('loginToPlayRouteGame')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-orienteering hover:bg-orienteering/90"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {t('signIn')}
            </Button>
          </CardContent>
        </Card>
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
      {/* Map Selection */}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* All Maps Option */}
                <button
                  onClick={() => handleMapSelect('all')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                    selectedMapId === 'all'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <Shuffle className="h-8 w-8 mb-2 text-primary" />
                  <span className="font-medium text-sm">All Maps</span>
                  <span className="text-xs text-muted-foreground">Random mix</span>
                </button>
                
                {/* Individual Map Options */}
                {uniqueMapNames.map(mapName => (
                  <button
                    key={mapName}
                    onClick={() => handleMapSelect(mapName)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                      selectedMapId === mapName
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    {isPwtMap(mapName) && (
                      <div className="absolute top-1 right-1">
                        <PwtAttribution variant="badge" className="scale-75 origin-top-right" />
                      </div>
                    )}
                    <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="font-medium text-sm">{mapName}</span>
                    <span className="text-xs text-muted-foreground">
                      {availableMaps.find(m => m.name === mapName)?.description || 'Orienteering map'}
                    </span>
                  </button>
                ))}
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
