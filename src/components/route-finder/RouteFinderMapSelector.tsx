import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Shuffle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import flagItaly from '@/assets/flag-italy.png';
import flagSweden from '@/assets/flag-sweden.png';
import flagBelgium from '@/assets/flag-belgium.png';

// Country code to flag image mapping
const COUNTRY_FLAG_IMAGES: Record<string, string> = {
  IT: flagItaly,
  SE: flagSweden,
  BE: flagBelgium,
};

interface MapOption {
  id: string;
  name: string;
  description?: string;
  challenge_count: number;
  country_code?: string | null;
  location_name?: string | null;
}

interface RouteFinderMapSelectorProps {
  maps: MapOption[];
  isLoading: boolean;
  selectedMapId: string | null;
  onSelectMap: (mapId: string | null) => void;
}

const RouteFinderMapSelector: React.FC<RouteFinderMapSelectorProps> = ({
  maps,
  isLoading,
  selectedMapId,
  onSelectMap,
}) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t('loadingMaps')}
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No maps available yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {/* All Maps Option */}
      <button
        onClick={() => onSelectMap(null)}
        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
          selectedMapId === null
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card'
        }`}
      >
        <Shuffle className="h-8 w-8 mb-2 text-primary" />
        <span className="font-medium text-sm">All Maps</span>
        <span className="text-xs text-muted-foreground">Random mix</span>
      </button>

      {/* Individual Map Options */}
      {maps.map((map) => {
        const flagImage = map.country_code ? COUNTRY_FLAG_IMAGES[map.country_code] : null;
        const isSelected = selectedMapId === map.id;
        
        return (
          <button
            key={map.id}
            onClick={() => onSelectMap(map.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
              isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
            }`}
          >
            {flagImage && (
              <img 
                src={flagImage} 
                alt={map.country_code || ''} 
                className="absolute top-1 right-1 w-5 h-4 object-cover rounded-sm shadow-sm" 
              />
            )}
            <MapPin className="h-8 w-8 mb-2 text-primary" />
            <span className="font-medium text-sm">{map.name}</span>
            <span className="text-xs text-muted-foreground">
              {map.challenge_count} challenge{map.challenge_count !== 1 ? 's' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default RouteFinderMapSelector;
