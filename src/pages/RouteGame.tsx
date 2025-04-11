
import React, { useState, useEffect } from 'react';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import { getAvailableMaps, MapSource, fetchRouteDataForMap, RouteData } from '../utils/routeDataUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/use-toast';
import { AlertCircle } from 'lucide-react';

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [selectedMap, setSelectedMap] = useState<MapSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [availableMaps, setAvailableMaps] = useState<MapSource[]>([]);
  
  // Load available maps
  useEffect(() => {
    const loadMaps = async () => {
      setIsLoading(true);
      try {
        const maps = await getAvailableMaps();
        setAvailableMaps(maps);
        
        // If no maps are available, show an error
        if (maps.length === 0) {
          toast({
            title: t('error'),
            description: t('noMapsAvailable'),
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        
        // Filter maps based on device
        const filteredMaps = maps.filter(map => 
          isMobile ? map.aspect === '9:16' : map.aspect === '16:9'
        );
        
        // If no filtered maps available, switch to other aspect ratio
        if (filteredMaps.length === 0) {
          console.warn('No maps available for current device, using alternative aspect ratio');
          // Try to use any available map regardless of aspect ratio
          if (maps.length > 0) {
            setSelectedMapId(maps[0].id);
          }
        } else {
          // Default to first filtered map
          setSelectedMapId(filteredMaps[0].id);
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
  }, [isMobile, t]);
  
  // Load selected map data
  useEffect(() => {
    if (!selectedMapId || availableMaps.length === 0) return;
    
    const mapSource = availableMaps.find(map => map.id === selectedMapId);
    if (!mapSource) return;
    
    setSelectedMap(mapSource);
    setIsLoading(true);
    
    fetchRouteDataForMap(mapSource)
      .then(data => {
        if (data.length === 0) {
          toast({
            title: t('error'),
            description: t('errorLoadingPage'),
            variant: "destructive"
          });
          return;
        }
        
        console.log(`Loaded ${data.length} routes for map: ${mapSource.name}`);
        setRouteData(data);
      })
      .catch(error => {
        console.error('Failed to load route data:', error);
        toast({
          title: t('error'),
          description: t('errorLoadingPage'),
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedMapId, availableMaps, t]);
  
  // Filtered map sources based on device
  const filteredMaps = availableMaps.filter(map => 
    isMobile ? map.aspect === '9:16' : map.aspect === '16:9'
  );
  
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
            {filteredMaps.length > 0 ? (
              <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectMapPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredMaps.map(map => (
                    <SelectItem key={map.id} value={map.id}>
                      {map.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center p-4 text-sm text-amber-800 border border-amber-200 rounded-md bg-amber-50">
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                <span>
                  {isLoading ? 
                    t('loadingMaps') : 
                    t('noMapsAvailable')}
                </span>
              </div>
            )}
            {selectedMap?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{selectedMap.description}</p>
            )}
          </CardContent>
        </Card>
      </section>
      
      {/* Route Selector Section - conditionally render mobile or desktop version */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : routeData.length > 0 && selectedMap && (
        <section className="max-w-4xl mx-auto">
          {isMobile ? (
            <MobileRouteSelector 
              routeData={routeData} 
              mapSource={selectedMap}
            />
          ) : (
            <RouteSelector 
              routeData={routeData} 
              mapSource={selectedMap}
            />
          )}
        </section>
      )}
      
      {/* Toggle Leaderboard Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-orienteering hover:bg-orienteering/90"
        >
          {showLeaderboard ? t('routeChoose') : t('leaderboard')}
        </Button>
      </div>
      
      {/* Leaderboard Section */}
      {showLeaderboard && (
        <section className="max-w-2xl mx-auto animate-fade-in">
          <Leaderboard />
        </section>
      )}
    </div>
  );
};

export default RouteGame;
