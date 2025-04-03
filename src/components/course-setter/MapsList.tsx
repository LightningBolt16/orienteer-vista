
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Map as MapIcon } from 'lucide-react';
import { MapInfo } from '../../hooks/useEventState';
import MapUploader from '../MapUploader';

interface MapsListProps {
  sampleMaps: MapInfo[];
  onSelectMap: (mapId: string) => void;
  onMapUploaded: (metadata: any) => void;
}

const MapsList: React.FC<MapsListProps> = ({ 
  sampleMaps,
  onSelectMap,
  onMapUploaded
}) => {
  const { t } = useLanguage();

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleMaps.map(map => (
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
                      onClick={() => onSelectMap(map.id)}
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
        
        <div className="mt-6">
          <MapUploader onMapUploaded={onMapUploaded} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MapsList;
