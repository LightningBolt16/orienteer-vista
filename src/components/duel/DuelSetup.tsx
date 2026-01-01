import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../context/LanguageContext';
import { useRouteCache } from '../../context/RouteCache';
import { MapSource, getUniqueMapNames } from '../../utils/routeDataUtils';
import { Map, Shuffle, Swords, AlertCircle } from 'lucide-react';
import { isPwtMap } from '../PwtAttribution';
import PwtAttribution from '../PwtAttribution';
import kartkompanietLogo from '@/assets/kartkompaniet-logo.png';
import flagItaly from '@/assets/flag-italy.png';
import flagSweden from '@/assets/flag-sweden.png';
import flagBelgium from '@/assets/flag-belgium.png';

interface DuelSetupProps {
  onStart: (mapId: string, routeCount: number) => void;
  onBack: () => void;
}

const ROUTE_COUNT_OPTIONS = [5, 10, 15, 20, 30];

const DuelSetup: React.FC<DuelSetupProps> = ({ onStart, onBack }) => {
  const { t } = useLanguage();
  const { desktopCache, isPreloading } = useRouteCache();
  const [selectedMapId, setSelectedMapId] = useState<string>('all');
  const [selectedRouteCount, setSelectedRouteCount] = useState<number>(10);

  const availableMaps = desktopCache?.maps || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);

  const handleStart = () => {
    onStart(selectedMapId, selectedRouteCount);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Swords className="h-8 w-8 text-primary" />
          Duel Setup
        </h1>
        <p className="text-muted-foreground">Choose your battleground</p>
      </div>

      {/* Map Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Map</CardTitle>
          <CardDescription>Choose a map for the duel</CardDescription>
        </CardHeader>
        <CardContent>
          {isPreloading ? (
            <div className="flex items-center p-4 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
              Loading maps...
            </div>
          ) : uniqueMapNames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* All Maps Option */}
              <button
                onClick={() => setSelectedMapId('all')}
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
              {uniqueMapNames.map(mapName => {
                const isPwt = isPwtMap(mapName);
                const isKnivsta = mapName.toLowerCase().includes('knivsta');
                const isBelgien = mapName.toLowerCase().includes('belgien');
                const countryFlag = isPwt ? flagItaly : isKnivsta ? flagSweden : isBelgien ? flagBelgium : null;
                
                return (
                  <button
                    key={mapName}
                    onClick={() => setSelectedMapId(mapName)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                      selectedMapId === mapName
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    {countryFlag && (
                      <img 
                        src={countryFlag} 
                        alt="Country flag" 
                        className="absolute top-1 right-1 h-4 w-6 object-cover rounded-sm shadow-sm"
                      />
                    )}
                    {isPwt ? (
                      <PwtAttribution variant="badge" className="mb-2" />
                    ) : isKnivsta ? (
                      <img src={kartkompanietLogo} alt="Kartkompaniet" className="h-8 w-8 mb-2 object-contain" />
                    ) : (
                      <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{mapName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center p-4 text-sm text-amber-800 border border-amber-200 rounded-md bg-amber-50">
              <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
              <span>No maps available</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Count Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Number of Routes</CardTitle>
          <CardDescription>How many routes to compete on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 justify-center">
            {ROUTE_COUNT_OPTIONS.map(count => (
              <button
                key={count}
                onClick={() => setSelectedRouteCount(count)}
                className={`px-6 py-3 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                  selectedRouteCount === count
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleStart} className="flex-1" disabled={isPreloading}>
          <Swords className="h-5 w-5 mr-2" />
          Start Duel!
        </Button>
      </div>
    </div>
  );
};

export default DuelSetup;
