
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Map as MapIcon } from 'lucide-react';
import { MapInfo } from '../../hooks/useEventState';
import MapUploader from '../MapUploader';
import { supabase } from '../../integrations/supabase/client';
import { useUser } from '../../context/UserContext';
import { toast } from '../ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface MapsListProps {
  sampleMaps: MapInfo[];
  onSelectMap: (mapId: string) => void;
  onMapUploaded: (metadata: any) => void;
  onUseMap?: (mapId: string) => void; // Make onUseMap optional
}

const MapsList: React.FC<MapsListProps> = ({ 
  sampleMaps,
  onSelectMap,
  onMapUploaded,
  onUseMap
}) => {
  const { t } = useLanguage();
  const { user } = useUser();
  const [userMaps, setUserMaps] = useState<MapInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch user's maps when component mounts
  useEffect(() => {
    const fetchUserMaps = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('maps')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching maps:', error);
          toast({
            title: t('error'),
            description: error.message,
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        
        // Transform data to match MapInfo format and parse metadata from description
        const transformedMaps: MapInfo[] = data.map(map => {
          // Try to parse the description as JSON to extract type and scale
          // Default to 'forest' type and '10000' scale
          let mapType: 'forest' | 'sprint' = 'forest';
          let mapScale = '10000';
          
          try {
            if (map.description) {
              const metadata = JSON.parse(map.description);
              // Ensure mapType is one of the allowed values
              if (metadata.type && (metadata.type === 'forest' || metadata.type === 'sprint')) {
                mapType = metadata.type as 'forest' | 'sprint';
              }
              if (metadata.scale) mapScale = metadata.scale;
            }
          } catch (e) {
            console.error('Error parsing map metadata:', e);
          }
          
          return {
            id: map.id,
            name: map.name,
            imageUrl: map.file_url,
            type: mapType,
            scale: mapScale
          };
        });
        
        setUserMaps(transformedMaps);
      } catch (error: any) {
        console.error('Error fetching maps:', error);
        toast({
          title: t('error'),
          description: error.message || 'Failed to fetch maps',
          variant: 'destructive'
        });
      }
      setLoading(false);
    };
    
    fetchUserMaps();
  }, [user, t]);

  // Handle map selection and navigate to new event tab
  const handleUseMap = (mapId: string) => {
    if (onUseMap) {
      onUseMap(mapId);
    } else {
      onSelectMap(mapId);
      // Redirect to the new event tab
      navigate('/course-setter', { state: { activeTab: 'new-event', selectedMapId: mapId } });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('my.maps')}</CardTitle>
        <CardDescription>{t('manage.your.maps')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('available.maps')}</h3>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {userMaps.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>{t('no.maps.available')}</p>
                <p className="text-sm mt-2">{t('upload.maps.below')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userMaps.map(map => (
                  <Card key={map.id} className="overflow-hidden">
                    <div className="aspect-[4/3] relative">
                      <img 
                        src={map.imageUrl} 
                        alt={map.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{map.name}</h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUseMap(map.id)}
                          >
                            <MapIcon className="h-4 w-4 mr-2" />
                            {t('use')}
                          </Button>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {map.type === 'sprint' ? 'Sprint' : 'Forest'} • 1:{parseInt(map.scale).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        
        <div className="mt-6">
          <MapUploader onMapUploaded={onMapUploaded} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MapsList;
