import React, { useState, useEffect, useRef, useCallback } from 'react';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import { getAvailableMaps, MapSource, fetchRouteDataForMap, fetchAllRoutesData, RouteData, getUniqueMapNames } from '../utils/routeDataUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/use-toast';
import { AlertCircle, Map, Shuffle, Maximize2, Minimize2 } from 'lucide-react';

type MapSelection = 'all' | string;

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<MapSelection>('all');
  const [selectedMap, setSelectedMap] = useState<MapSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [availableMaps, setAvailableMaps] = useState<MapSource[]>([]);
  const [allMapsForRoutes, setAllMapsForRoutes] = useState<MapSource[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    // For mobile or when native fullscreen isn't supported, use CSS-based fullscreen
    if (isMobile || !document.fullscreenEnabled) {
      setIsFullscreen(prev => !prev);
      return;
    }

    // Desktop: use native fullscreen API
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
      // Fallback to CSS-based fullscreen if native fails
      console.error('Fullscreen error, using CSS fallback:', error);
      setIsFullscreen(prev => !prev);
    }
  }, [isMobile]);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Only sync state with native fullscreen on desktop
      if (!isMobile && document.fullscreenEnabled) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isMobile]);
  
  // Load available maps
  useEffect(() => {
    const loadMaps = async () => {
      setIsLoading(true);
      try {
        const maps = await getAvailableMaps();
        setAvailableMaps(maps);
        
        if (maps.length === 0) {
          toast({
            title: t('error'),
            description: t('noMapsAvailable'),
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to load maps:', error);
        toast({
          title: t('error'),
          description: t('errorLoadingPage'),
          variant: "destructive"
        });
      }
      setIsLoading(false);
    };
    
    loadMaps();
  }, [t]);
  
  // Load route data based on selection
  useEffect(() => {
    const loadRoutes = async () => {
      if (availableMaps.length === 0) return;
      
      setIsLoading(true);
      
      try {
        if (selectedMapId === 'all') {
          // Fetch all routes from all maps
          const { routes, maps } = await fetchAllRoutesData(isMobile);
          setRouteData(routes);
          setAllMapsForRoutes(maps);
          setSelectedMap(null);
        } else {
          // Fetch routes for specific map
          const aspect = isMobile ? '9:16' : '16:9';
          const mapSource = availableMaps.find(
            map => map.name === selectedMapId && map.aspect === aspect
          );
          
          if (mapSource) {
            const data = await fetchRouteDataForMap(mapSource);
            setRouteData(data);
            setSelectedMap(mapSource);
            setAllMapsForRoutes([mapSource]);
          }
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
  }, [selectedMapId, availableMaps, isMobile, t]);
  
  // Get unique map names for selection
  const uniqueMapNames = getUniqueMapNames(availableMaps);
  
  const handleMapSelect = (mapName: MapSelection) => {
    setSelectedMapId(mapName);
  };
  
  return (
    <div className="pb-20 space-y-8">
      {/* Map Selection */}
      <section className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('selectMap')}</CardTitle>
            <CardDescription>{t('selectMapDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && availableMaps.length === 0 ? (
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
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                      selectedMapId === mapName
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
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
      {isLoading ? (
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
          <Leaderboard />
        </section>
      )}
    </div>
  );
};

export default RouteGame;
