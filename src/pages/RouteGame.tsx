
import React, { useState, useEffect } from 'react';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';
import { mapSources, MapSource, fetchRouteDataForMap, RouteData } from '../utils/routeDataUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/use-toast';

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [selectedMap, setSelectedMap] = useState<MapSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  
  // Initialize with appropriate default map based on device
  useEffect(() => {
    const defaultMapId = isMobile ? 'default-portrait' : 'default-landscape';
    if (!selectedMapId) {
      setSelectedMapId(defaultMapId);
    }
  }, [isMobile, selectedMapId]);
  
  // Load selected map data
  useEffect(() => {
    if (!selectedMapId) return;
    
    const mapSource = mapSources.find(map => map.id === selectedMapId);
    if (!mapSource) return;
    
    setSelectedMap(mapSource);
    setIsLoading(true);
    
    fetchRouteDataForMap(mapSource)
      .then(data => {
        if (data.length === 0) {
          toast({
            title: t('error'),
            description: t('error.loading.routes'),
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
          description: t('error.loading.routes'),
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedMapId, t]);
  
  // Filtered map sources based on device
  const availableMaps = mapSources.filter(map => 
    isMobile ? map.aspect === '9:16' : map.aspect === '16:9'
  );
  
  return (
    <div className="pb-20 space-y-8">
      {/* Map Selection */}
      <section className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('select.map')}</CardTitle>
            <CardDescription>{t('select.map.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedMapId} onValueChange={setSelectedMapId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('select.map.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableMaps.map(map => (
                  <SelectItem key={map.id} value={map.id}>
                    {map.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {showLeaderboard ? t('route.choose') : t('leaderboard')}
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
