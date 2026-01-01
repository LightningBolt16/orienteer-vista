import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useLanguage } from '../../context/LanguageContext';
import { useRouteCache } from '../../context/RouteCache';
import { MapSource, getUniqueMapNames } from '../../utils/routeDataUtils';
import { Map, Shuffle, Swords, AlertCircle, Zap, Clock, Timer, Pause } from 'lucide-react';
import { isPwtMap } from '../PwtAttribution';
import PwtAttribution from '../PwtAttribution';
import kartkompanietLogo from '@/assets/kartkompaniet-logo.png';
import flagItaly from '@/assets/flag-italy.png';
import flagSweden from '@/assets/flag-sweden.png';
import flagBelgium from '@/assets/flag-belgium.png';

export interface DuelSettings {
  mapId: string;
  gameType: 'routes' | 'timed'; // routes = fixed count, timed = unlimited within time
  routeCount: number;
  gameDuration?: number; // total game time in seconds (for timed mode)
  gameMode: 'speed' | 'wait';
  timeLimit?: number; // seconds per route, undefined means no limit
}

interface DuelSetupProps {
  onStart: (settings: DuelSettings) => void;
  onBack: () => void;
}

const ROUTE_COUNT_OPTIONS = [5, 10, 15, 20, 30, 50, 75, 100];
const TIME_PER_ROUTE_OPTIONS = [
  { label: 'No limit', value: undefined },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
];
const GAME_DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

const DuelSetup: React.FC<DuelSetupProps> = ({ onStart, onBack }) => {
  const { t } = useLanguage();
  const { mobileCache, isPreloading } = useRouteCache();
  const [selectedMapId, setSelectedMapId] = useState<string>('all');
  const [gameType, setGameType] = useState<'routes' | 'timed'>('routes');
  const [selectedRouteCount, setSelectedRouteCount] = useState<number>(10);
  const [customRouteCount, setCustomRouteCount] = useState<string>('');
  const [isCustomRoutes, setIsCustomRoutes] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [gameMode, setGameMode] = useState<'speed' | 'wait'>('speed');
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const availableMaps = mobileCache?.maps || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);

  const handleStart = () => {
    const routeCount = isCustomRoutes ? parseInt(customRouteCount) || 10 : selectedRouteCount;
    const gameDuration = isCustomDuration ? parseInt(customDuration) || 60 : selectedDuration;
    onStart({
      mapId: selectedMapId,
      gameType,
      routeCount: gameType === 'routes' ? Math.min(Math.max(1, routeCount), 200) : 999,
      gameDuration: gameType === 'timed' ? gameDuration : undefined,
      gameMode,
      timeLimit,
    });
  };

  const handleRouteCountSelect = (count: number) => {
    setSelectedRouteCount(count);
    setIsCustomRoutes(false);
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setIsCustomDuration(false);
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

      {/* Game Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Game Mode</CardTitle>
          <CardDescription>How do you want to compete?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGameMode('speed')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                gameMode === 'speed'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <span className="font-medium text-sm">Speed Race</span>
              <span className="text-xs text-muted-foreground text-center">Fastest answer wins bonus points</span>
            </button>
            
            <button
              onClick={() => setGameMode('wait')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                gameMode === 'wait'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Pause className="h-8 w-8 mb-2 text-blue-500" />
              <span className="font-medium text-sm">Turn-Based</span>
              <span className="text-xs text-muted-foreground text-center">Wait for both players</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Time Limit per Route (only for routes mode or speed mode) */}
      {gameType === 'routes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time Limit per Route
            </CardTitle>
            <CardDescription>Set a time limit per route (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center">
              {TIME_PER_ROUTE_OPTIONS.map(option => (
                <button
                  key={option.label}
                  onClick={() => setTimeLimit(option.value)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all hover:border-primary/50 ${
                    timeLimit === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Game Length
          </CardTitle>
          <CardDescription>Choose fixed routes or time-based challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGameType('routes')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                gameType === 'routes'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Map className="h-8 w-8 mb-2 text-green-500" />
              <span className="font-medium text-sm">Fixed Routes</span>
              <span className="text-xs text-muted-foreground text-center">Set number of routes</span>
            </button>
            
            <button
              onClick={() => setGameType('timed')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                gameType === 'timed'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Timer className="h-8 w-8 mb-2 text-orange-500" />
              <span className="font-medium text-sm">Time Challenge</span>
              <span className="text-xs text-muted-foreground text-center">Race against the clock</span>
            </button>
          </div>

          {/* Route Count (for routes mode) */}
          {gameType === 'routes' && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-center">Number of Routes</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {ROUTE_COUNT_OPTIONS.map(count => (
                  <button
                    key={count}
                    onClick={() => handleRouteCountSelect(count)}
                    className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                      !isCustomRoutes && selectedRouteCount === count
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card'
                    }`}
                  >
                    {count}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomRoutes(true)}
                  className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                    isCustomRoutes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {isCustomRoutes && (
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="Enter number (1-200)"
                    value={customRouteCount}
                    onChange={(e) => setCustomRouteCount(e.target.value)}
                    className="w-48 text-center"
                  />
                </div>
              )}
            </div>
          )}

          {/* Duration (for timed mode) */}
          {gameType === 'timed' && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-center">Game Duration</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {GAME_DURATION_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleDurationSelect(option.value)}
                    className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                      !isCustomDuration && selectedDuration === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomDuration(true)}
                  className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                    isCustomDuration
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {isCustomDuration && (
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    min={10}
                    max={3600}
                    placeholder="Seconds (10-3600)"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-48 text-center"
                  />
                </div>
              )}
              
              <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                ⚠️ Wrong answers: -0.5 points penalty
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleStart} 
          className="flex-1" 
          disabled={isPreloading || (gameType === 'routes' && isCustomRoutes && !customRouteCount) || (gameType === 'timed' && isCustomDuration && !customDuration)}
        >
          <Swords className="h-5 w-5 mr-2" />
          Start Duel!
        </Button>
      </div>
    </div>
  );
};

export default DuelSetup;
