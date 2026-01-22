import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useLanguage } from '../../context/LanguageContext';
import { useRouteCache } from '../../context/RouteCache';
import { useUser } from '../../context/UserContext';
import { useCommunityFavorites } from '../../hooks/useCommunityFavorites';
import { getUniqueMapNames } from '../../utils/routeDataUtils';
import { 
  Map, Shuffle, Swords, AlertCircle, Zap, Clock, Timer, Pause, 
  Wifi, Users, Lock, ChevronDown, ChevronUp, Star, MapPin, Check, 
  Layers, ArrowLeft, ArrowRight, ChevronLeft 
} from 'lucide-react';
import { isPwtMap } from '../PwtAttribution';
import PwtAttribution from '../PwtAttribution';
import ScoringInfoDialog from './ScoringInfoDialog';
import CommunityMapBrowser from '../map/CommunityMapBrowser';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { toast as sonnerToast } from 'sonner';
import kartkompanietLogo from '@/assets/kartkompaniet-logo.png';
import flagItaly from '@/assets/flag-italy.png';
import flagSweden from '@/assets/flag-sweden.png';
import flagBelgium from '@/assets/flag-belgium.png';
import { Progress } from '../ui/progress';

const LOGO_STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/map-logos`;

export type MapCategory = 'official' | 'private' | 'community';

export interface DuelSettings {
  mapId: string;
  mapIds?: string[];
  mapCategory?: MapCategory;
  gameType: 'routes' | 'timed';
  routeCount: number;
  gameDuration?: number;
  gameMode: 'speed' | 'wait';
  timeLimit?: number;
  isOnline?: boolean;
  playerName?: string;
  maxPlayers?: number;
}

interface DuelSetupWizardProps {
  onStart: (settings: DuelSettings) => void;
  onStartOnline: (settings: DuelSettings) => void;
  onJoinRoom: (playerName: string) => void;
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

type WizardStep = 'playMode' | 'map' | 'gameMode' | 'gameLength' | 'confirm';

const DuelSetupWizard: React.FC<DuelSetupWizardProps> = ({ onStart, onStartOnline, onJoinRoom, onBack }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useUser();
  const { desktopCache, mobileCache, isPreloading, userMaps, communityMaps } = useRouteCache();
  const { favorites, favoriteMaps, toggleFavorite } = useCommunityFavorites();
  
  // Current step
  const [currentStep, setCurrentStep] = useState<WizardStep>('playMode');
  
  // Settings state
  const [playMode, setPlayMode] = useState<'local' | 'online' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(2);
  const [selectedMapId, setSelectedMapId] = useState<string>('all');
  const [selectedMapCategory, setSelectedMapCategory] = useState<MapCategory>('official');
  const [gameType, setGameType] = useState<'routes' | 'timed'>('routes');
  const [selectedRouteCount, setSelectedRouteCount] = useState<number>(10);
  const [customRouteCount, setCustomRouteCount] = useState<string>('');
  const [isCustomRoutes, setIsCustomRoutes] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [gameMode, setGameMode] = useState<'speed' | 'wait'>('wait');
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  
  // Multi-select mode state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  
  // Collapsible states
  const [privateMapsOpen, setPrivateMapsOpen] = useState(false);
  const [communityMapsOpen, setCommunityMapsOpen] = useState(false);
  
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || 'ontouchstart' in window);
  const isSpeedRaceDisabled = isMobile && playMode === 'local';
  const isOnlineMode = playMode === 'online';
  const isTurnBasedDisabled = isOnlineMode;
  
  // Auto-switch game mode based on constraints
  useEffect(() => {
    if (isSpeedRaceDisabled && gameMode === 'speed') {
      setGameMode('wait');
    }
    if (isOnlineMode && gameMode === 'wait') {
      setGameMode('speed');
    }
  }, [isSpeedRaceDisabled, isOnlineMode, gameMode]);

  const availableMaps = (isMobile ? mobileCache?.maps : desktopCache?.maps) || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);
  const uniqueUserMapNames = getUniqueMapNames(userMaps);
  const uniqueFavoriteMapNames = favoriteMaps.map(m => m.name);

  const steps: WizardStep[] = ['playMode', 'map', 'gameMode', 'gameLength', 'confirm'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleMapSelect = (mapName: string, category: MapCategory = 'official') => {
    if (multiSelectMode && mapName !== 'all') {
      setSelectedMaps(prev => 
        prev.includes(mapName) 
          ? prev.filter(m => m !== mapName)
          : [...prev, mapName]
      );
      setSelectedMapCategory(category);
    } else {
      setMultiSelectMode(false);
      setSelectedMaps([]);
      setSelectedMapId(mapName);
      setSelectedMapCategory(category);
    }
  };

  const toggleMultiSelectMode = () => {
    if (multiSelectMode) {
      setSelectedMaps([]);
    }
    setMultiSelectMode(!multiSelectMode);
  };

  const buildSettings = (): DuelSettings => {
    const routeCount = isCustomRoutes ? parseInt(customRouteCount) || 10 : selectedRouteCount;
    const gameDuration = isCustomDuration ? parseInt(customDuration) || 60 : selectedDuration;
    return {
      mapId: multiSelectMode && selectedMaps.length > 0 ? 'multi' : selectedMapId,
      mapIds: multiSelectMode && selectedMaps.length > 0 ? selectedMaps : undefined,
      mapCategory: selectedMapCategory,
      gameType,
      routeCount: gameType === 'routes' ? Math.min(Math.max(1, routeCount), 200) : 999,
      gameDuration: gameType === 'timed' ? gameDuration : undefined,
      gameMode,
      timeLimit,
      playerName: playerName.trim() || undefined,
      maxPlayers: playMode === 'online' ? maxPlayers : 2,
    };
  };

  const handleStart = () => {
    onStart(buildSettings());
  };

  const handleStartOnlineRoom = () => {
    onStartOnline({
      ...buildSettings(),
      isOnline: true,
    });
  };

  const handleJoinRoom = () => {
    onJoinRoom(playerName.trim() || 'Player');
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'playMode':
        return playMode !== null;
      case 'map':
        return multiSelectMode ? selectedMaps.length > 0 : selectedMapId !== '';
      case 'gameMode':
        return true;
      case 'gameLength':
        if (gameType === 'routes' && isCustomRoutes && !customRouteCount) return false;
        if (gameType === 'timed' && isCustomDuration && !customDuration) return false;
        return true;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentStepIndex === 0) {
      onBack();
    } else {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'playMode': return 'Choose Play Mode';
      case 'map': return 'Select Map';
      case 'gameMode': return 'Game Mode';
      case 'gameLength': return 'Game Length';
      case 'confirm': return 'Ready to Duel!';
    }
  };

  const renderPlayModeStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Play Mode</CardTitle>
        <CardDescription>Choose how you want to duel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPlayMode('local')}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50 ${
              playMode === 'local'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
          >
            <Users className="h-10 w-10 mb-3 text-primary" />
            <span className="font-medium">Local</span>
            <span className="text-sm text-muted-foreground">Same device</span>
          </button>
          
          <button
            onClick={() => setPlayMode('online')}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50 ${
              playMode === 'online'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
          >
            <Wifi className="h-10 w-10 mb-3 text-green-500" />
            <span className="font-medium">Online</span>
            <span className="text-sm text-muted-foreground">Play remotely</span>
          </button>
        </div>

        {playMode === 'online' && (
          <div className="space-y-3 pt-4 border-t border-border">
            <Input 
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="text-center"
            />
            
            <Button 
              variant="outline" 
              onClick={handleJoinRoom}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Join Existing Room
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMapStep = () => (
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
          <div className="space-y-6">
            {/* Multi-Select Toggle */}
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
                <span className="text-sm text-muted-foreground">
                  {selectedMaps.length} map{selectedMaps.length > 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            {/* Official Maps Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto">
              {!multiSelectMode && (
                <button
                  onClick={() => handleMapSelect('all', 'official')}
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
              
              {uniqueMapNames.map(mapName => {
                const isPwt = isPwtMap(mapName);
                const isKnivsta = mapName.toLowerCase().includes('knivsta');
                const isEkeby = mapName.toLowerCase().includes('ekeby');
                const isBelgien = mapName.toLowerCase().includes('belgien');
                const isGeel = mapName.toLowerCase().includes('geel');
                const countryFlag = isPwt ? flagItaly : (isKnivsta || isEkeby) ? flagSweden : (isBelgien || isGeel) ? flagBelgium : null;
                const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'official';
                
                return (
                  <button
                    key={mapName}
                    onClick={() => handleMapSelect(mapName, 'official')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                      isMultiSelected || isSingleSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    {multiSelectMode && isMultiSelected && (
                      <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    {countryFlag && (
                      <img 
                        src={countryFlag} 
                        alt="Country flag" 
                        className="absolute top-1 right-1 h-4 w-6 object-cover rounded-sm shadow-sm"
                      />
                    )}
                    {isPwt ? (
                      <PwtAttribution variant="badge" className="mb-2" />
                    ) : (isKnivsta || isEkeby) ? (
                      <img src={kartkompanietLogo} alt="Kartkompaniet" className="h-8 w-8 mb-2 object-contain" />
                    ) : (
                      <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{mapName}</span>
                  </button>
                );
              })}
            </div>

            {/* Private Maps Collapsible */}
            {user && uniqueUserMapNames.length > 0 && (
              <Collapsible open={privateMapsOpen} onOpenChange={setPrivateMapsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Private Maps</span>
                      <span className="text-xs text-muted-foreground">({uniqueUserMapNames.length})</span>
                    </div>
                    {privateMapsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uniqueUserMapNames.map(mapName => {
                      const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                      const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'private';
                      return (
                        <button
                          key={mapName}
                          onClick={() => handleMapSelect(mapName, 'private')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                            isMultiSelected || isSingleSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                          }`}
                        >
                          {multiSelectMode && isMultiSelected && (
                            <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                          <span className="font-medium text-sm">{mapName}</span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Community Maps Collapsible */}
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
                <div className="mb-4">
                  <CommunityMapBrowser 
                    onSelectMap={(mapName) => handleMapSelect(mapName, 'community')}
                    selectedMapName={selectedMapCategory === 'community' ? (selectedMapId === 'all' ? undefined : selectedMapId) : undefined}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
                
                {uniqueFavoriteMapNames.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uniqueFavoriteMapNames.map(mapName => {
                      const mapSource = communityMaps.find(m => m.name === mapName);
                      const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                      const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'community';
                      return (
                        <button
                          key={mapName}
                          onClick={() => handleMapSelect(mapName, 'community')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                            isMultiSelected || isSingleSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                          }`}
                        >
                          {multiSelectMode && isMultiSelected && (
                            <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <Star className="absolute top-1 right-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <Users className="h-8 w-8 mb-2 text-muted-foreground" />
                          <span className="font-medium text-sm">{mapName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="flex items-center p-4 text-sm text-amber-800 border border-amber-200 rounded-md bg-amber-50">
            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
            <span>No maps available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderGameModeStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Game Mode
          <ScoringInfoDialog gameMode={gameMode} gameType={gameType} isOnline={playMode === 'online'} />
        </CardTitle>
        <CardDescription>How do you want to compete?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => !isSpeedRaceDisabled && setGameMode('speed')}
            disabled={isSpeedRaceDisabled}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all relative ${
              isSpeedRaceDisabled
                ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                : gameMode === 'speed'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <Zap className="h-10 w-10 mb-3 text-yellow-500" />
            <span className="font-medium">Speed Race</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {isSpeedRaceDisabled ? 'Not available on mobile Local' : 'Fastest answer wins bonus'}
            </span>
          </button>
          
          <button
            onClick={() => !isTurnBasedDisabled && setGameMode('wait')}
            disabled={isTurnBasedDisabled}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all relative ${
              isTurnBasedDisabled
                ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                : gameMode === 'wait'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <Pause className="h-10 w-10 mb-3 text-blue-500" />
            <span className="font-medium">Turn-Based</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {isTurnBasedDisabled ? 'Not available for online' : 'Wait for both players'}
            </span>
          </button>
        </div>

        {/* Time Limit per Route */}
        {gameType === 'routes' && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-center flex items-center justify-center gap-2">
              <Timer className="h-4 w-4" />
              Time Limit per Route (optional)
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
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
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderGameLengthStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Game Length
        </CardTitle>
        <CardDescription>Choose fixed routes or time-based challenge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setGameType('routes')}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50 ${
              gameType === 'routes'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
          >
            <Map className="h-10 w-10 mb-3 text-green-500" />
            <span className="font-medium">Fixed Routes</span>
            <span className="text-xs text-muted-foreground">Set number of routes</span>
          </button>
          
          <button
            onClick={() => setGameType('timed')}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50 ${
              gameType === 'timed'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            }`}
          >
            <Timer className="h-10 w-10 mb-3 text-orange-500" />
            <span className="font-medium">Time Challenge</span>
            <span className="text-xs text-muted-foreground">Race against the clock</span>
          </button>
        </div>

        {gameType === 'routes' && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-center">Number of Routes</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ROUTE_COUNT_OPTIONS.map(count => (
                <button
                  key={count}
                  onClick={() => {
                    setSelectedRouteCount(count);
                    setIsCustomRoutes(false);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
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
                className={`px-4 py-2 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                  isCustomRoutes
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card'
                }`}
              >
                Custom
              </button>
            </div>
            
            {isCustomRoutes && (
              <div className="flex items-center justify-center">
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

        {gameType === 'timed' && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-center">Game Duration</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {GAME_DURATION_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedDuration(option.value);
                    setIsCustomDuration(false);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
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
                className={`px-4 py-2 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                  isCustomDuration
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card'
                }`}
              >
                Custom
              </button>
            </div>
            
            {isCustomDuration && (
              <div className="flex items-center justify-center">
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
  );

  const renderConfirmStep = () => {
    const settings = buildSettings();
    const mapDisplay = multiSelectMode && selectedMaps.length > 0 
      ? `${selectedMaps.length} maps selected` 
      : selectedMapId === 'all' 
        ? 'All Maps (Random)' 
        : selectedMapId;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Ready to Duel!
          </CardTitle>
          <CardDescription>Review your settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium">{playMode === 'online' ? 'Online' : 'Local'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Map</span>
              <span className="font-medium">{mapDisplay}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Game Mode</span>
              <span className="font-medium">{gameMode === 'speed' ? 'Speed Race' : 'Turn-Based'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Game Type</span>
              <span className="font-medium">
                {gameType === 'routes' 
                  ? `${isCustomRoutes ? customRouteCount : selectedRouteCount} routes` 
                  : `${isCustomDuration ? customDuration : selectedDuration}s time limit`}
              </span>
            </div>
            {timeLimit && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Time per Route</span>
                <span className="font-medium">{timeLimit}s</span>
              </div>
            )}
          </div>

          {/* Online mode: Player count & name at bottom */}
          {playMode === 'online' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Your Name</p>
                <Input 
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-center"
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Number of Players</p>
                <div className="flex justify-center gap-2">
                  {[2, 3, 4].map(count => (
                    <button
                      key={count}
                      onClick={() => setMaxPlayers(count)}
                      className={`px-6 py-2 rounded-lg border-2 font-bold transition-all hover:border-primary/50 ${
                        maxPlayers === count
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={handleStartOnlineRoom} 
                className="w-full" 
                size="lg"
                disabled={isPreloading}
              >
                <Wifi className="h-5 w-5 mr-2" />
                Create Online Room
              </Button>
            </div>
          )}

          {playMode === 'local' && (
            <Button 
              onClick={handleStart} 
              className="w-full" 
              size="lg"
              disabled={isPreloading}
            >
              <Users className="h-5 w-5 mr-2" />
              Start Local Duel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'playMode': return renderPlayModeStep();
      case 'map': return renderMapStep();
      case 'gameMode': return renderGameModeStep();
      case 'gameLength': return renderGameLengthStep();
      case 'confirm': return renderConfirmStep();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              {getStepTitle()}
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {renderCurrentStep()}

        {/* Navigation buttons (except on confirm step which has its own) */}
        {currentStep !== 'confirm' && (
          <div className="flex justify-end">
            <Button 
              onClick={goNext} 
              disabled={!canProceed()}
              className="gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelSetupWizard;
