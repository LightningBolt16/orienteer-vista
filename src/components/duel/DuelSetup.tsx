import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useLanguage } from '../../context/LanguageContext';
import { useRouteCache } from '../../context/RouteCache';
import { useUser } from '../../context/UserContext';
import { useCommunityFavorites } from '../../hooks/useCommunityFavorites';
import { MapSource, getUniqueMapNames } from '../../utils/routeDataUtils';
import { Map, Shuffle, Swords, AlertCircle, Zap, Clock, Timer, Pause, Wifi, Users, Lock, ChevronDown, ChevronUp, Star, MapPin, Check, Layers } from 'lucide-react';
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

// Storage URL for map logos
const LOGO_STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/map-logos`;

export type MapCategory = 'official' | 'private' | 'community';

export interface DuelSettings {
  mapId: string;
  mapIds?: string[]; // For multi-select mode
  mapCategory?: MapCategory;
  gameType: 'routes' | 'timed'; // routes = fixed count, timed = unlimited within time
  routeCount: number;
  gameDuration?: number; // total game time in seconds (for timed mode)
  gameMode: 'speed' | 'wait';
  timeLimit?: number; // seconds per route, undefined means no limit
  isOnline?: boolean; // true for online multiplayer
  playerName?: string; // player name for online mode
  maxPlayers?: number; // max players for online mode (2-4)
}

interface DuelSetupProps {
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

const DuelSetup: React.FC<DuelSetupProps> = ({ onStart, onStartOnline, onJoinRoom, onBack }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useUser();
  const { desktopCache, mobileCache, isPreloading, userMaps, communityMaps } = useRouteCache();
  const { favorites, favoriteMaps, toggleFavorite } = useCommunityFavorites();
  
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
  const [playButtonAnimating, setPlayButtonAnimating] = useState(false);
  
  // Private/Community collapsible states
  const [privateMapsOpen, setPrivateMapsOpen] = useState(false);
  const [communityMapsOpen, setCommunityMapsOpen] = useState(false);
  
  // Detect mobile device
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || 'ontouchstart' in window);
  
  // Speed race is disabled for mobile + Local mode (only one screen, can't show two routes)
  const isSpeedRaceDisabled = isMobile && playMode === 'local';
  
  // Auto-switch to wait mode if speed race becomes disabled
  React.useEffect(() => {
    if (isSpeedRaceDisabled && gameMode === 'speed') {
      setGameMode('wait');
    }
  }, [isSpeedRaceDisabled, gameMode]);

  const availableMaps = (isMobile ? mobileCache?.maps : desktopCache?.maps) || [];
  const uniqueMapNames = getUniqueMapNames(availableMaps);
  const uniqueUserMapNames = getUniqueMapNames(userMaps);
  const uniqueFavoriteMapNames = favoriteMaps.map(m => m.name);

  const handleMapSelect = (mapName: string, category: MapCategory = 'official') => {
    if (multiSelectMode && mapName !== 'all') {
      // Toggle selection in multi-select mode
      setSelectedMaps(prev => 
        prev.includes(mapName) 
          ? prev.filter(m => m !== mapName)
          : [...prev, mapName]
      );
      setSelectedMapCategory(category);
    } else {
      // Single select mode
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

      {/* Play Mode Selection - Online/Local */}
      <Card>
        <CardHeader>
          <CardTitle>Play Mode</CardTitle>
          <CardDescription>Choose how you want to duel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPlayMode('local')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                playMode === 'local'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Users className="h-8 w-8 mb-2 text-primary" />
              <span className="font-medium text-sm">Local</span>
              <span className="text-xs text-muted-foreground">Same device</span>
            </button>
            
            <button
              onClick={() => setPlayMode('online')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                playMode === 'online'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              <Wifi className="h-8 w-8 mb-2 text-green-500" />
              <span className="font-medium text-sm">Online</span>
              <span className="text-xs text-muted-foreground">Play remotely</span>
            </button>
          </div>

          {/* Online Mode: Name Input, Player Count, and Join Room Option */}
          {playMode === 'online' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Input 
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="text-center"
              />
              
              {/* Max Players Selector */}
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
            <div className="space-y-6">
              {/* Multi-Select Toggle and Play Button */}
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
                  <Button
                    onClick={() => {
                      setPlayButtonAnimating(true);
                      setTimeout(() => setPlayButtonAnimating(false), 200);
                      sonnerToast.success(`Selected ${selectedMaps.length} map${selectedMaps.length > 1 ? 's' : ''}`, {
                        description: selectedMaps.join(', '),
                        duration: 3000,
                      });
                    }}
                    className={`gap-2 bg-primary transition-transform duration-150 ${
                      playButtonAnimating ? 'scale-95' : 'hover:scale-105'
                    }`}
                  >
                    <Check className={`h-4 w-4 ${playButtonAnimating ? 'animate-spin' : ''}`} />
                    {selectedMaps.length} Map{selectedMaps.length > 1 ? 's' : ''} Selected
                  </Button>
                )}
              </div>

              {multiSelectMode && (
                <p className="text-sm text-muted-foreground">
                  Click maps to select them for a random mix in your duel.
                </p>
              )}

              {/* Official Maps Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* All Maps Option - Only show when not in multi-select mode */}
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
                
                {/* Individual Map Options */}
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
                      {/* Multi-select checkmark */}
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

              {/* Private Maps - Collapsible (only show if user is logged in and has maps) */}
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
                    <div className="p-3 mb-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <Lock className="h-3 w-3 inline mr-1" />
                        Stats from these maps are private and won't affect the public leaderboard.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Random Mix for Private Maps - hide in multi-select mode */}
                      {!multiSelectMode && uniqueUserMapNames.length > 1 && (
                        <button
                          onClick={() => handleMapSelect('all', 'private')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                            selectedMapId === 'all' && selectedMapCategory === 'private'
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card'
                          }`}
                        >
                          <Shuffle className="h-8 w-8 mb-2 text-primary" />
                          <span className="font-medium text-sm">Random Mix</span>
                          <span className="text-xs text-muted-foreground">All your maps</span>
                        </button>
                      )}
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
                            {/* Multi-select checkmark */}
                            {multiSelectMode && isMultiSelected && (
                              <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                            <span className="font-medium text-sm">{mapName}</span>
                            <span className="text-xs text-muted-foreground">Private</span>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => navigate('/my-maps')}
                        className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-primary/40 transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <Map className="h-8 w-8 mb-2 text-primary" />
                        <span className="font-medium text-sm text-primary">Upload New</span>
                      </button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Community Maps - Collapsible */}
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
                  <div className="p-3 mb-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <Star className="h-3 w-3 inline mr-1 fill-yellow-400 text-yellow-400" />
                      Star maps from the browser below to add them here.
                    </p>
                  </div>
                  
                  {/* Map Browser */}
                  <div className="mb-4">
                    <CommunityMapBrowser 
                      onSelectMap={(mapName) => handleMapSelect(mapName, 'community')}
                      selectedMapName={selectedMapCategory === 'community' ? (selectedMapId === 'all' ? undefined : selectedMapId) : undefined}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />
                  </div>
                  
                  {uniqueFavoriteMapNames.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Random Mix for Favorited Community Maps - hide in multi-select mode */}
                      {!multiSelectMode && uniqueFavoriteMapNames.length > 1 && (
                        <button
                          onClick={() => handleMapSelect('all', 'community')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                            selectedMapId === 'all' && selectedMapCategory === 'community'
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card'
                          }`}
                        >
                          <Shuffle className="h-8 w-8 mb-2 text-primary" />
                          <span className="font-medium text-sm">Random Mix</span>
                          <span className="text-xs text-muted-foreground">From favorites</span>
                        </button>
                      )}
                      {uniqueFavoriteMapNames.map(mapName => {
                        const mapSource = communityMaps.find(m => m.name === mapName);
                        const isMultiSelected = multiSelectMode && selectedMaps.includes(mapName);
                        const isSingleSelected = !multiSelectMode && selectedMapId === mapName && selectedMapCategory === 'community';
                        const logoUrl = mapSource?.logoPath ? `${LOGO_STORAGE_URL}/${mapSource.logoPath}` : null;
                        return (
                          <button
                            key={mapName}
                            onClick={() => handleMapSelect(mapName, 'community')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                              isMultiSelected || isSingleSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                            }`}
                          >
                            {/* Multi-select checkmark */}
                            {multiSelectMode && isMultiSelected && (
                              <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            <Star className="absolute top-1 right-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={`${mapName} logo`} 
                                className="h-8 w-8 mb-2 object-contain rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <Users className={`h-8 w-8 mb-2 text-muted-foreground ${logoUrl ? 'hidden' : ''}`} />
                            <span className="font-medium text-sm">{mapName}</span>
                            {mapSource?.locationName ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-full">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{mapSource.locationName.split(',')[0]}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Community</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No favorites yet. Use the map browser above to star community maps.
                    </p>
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

      {/* Game Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Game Mode
            <ScoringInfoDialog gameMode={gameMode} gameType={gameType} isOnline={playMode === 'online'} />
          </CardTitle>
          <CardDescription>How do you want to compete?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isSpeedRaceDisabled && setGameMode('speed')}
              disabled={isSpeedRaceDisabled}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all relative ${
                isSpeedRaceDisabled
                  ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                  : gameMode === 'speed'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <span className="font-medium text-sm">Speed Race</span>
              <span className="text-xs text-muted-foreground text-center">
                {isSpeedRaceDisabled ? 'Not available on mobile Local' : 'Fastest answer wins bonus points'}
              </span>
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
      {playMode && (
        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          {playMode === 'local' ? (
            <Button 
              onClick={handleStart} 
              className="flex-1" 
              disabled={isPreloading || (gameType === 'routes' && isCustomRoutes && !customRouteCount) || (gameType === 'timed' && isCustomDuration && !customDuration)}
            >
              <Users className="h-5 w-5 mr-2" />
              Start Local Duel
            </Button>
          ) : (
            <Button 
              onClick={handleStartOnlineRoom} 
              className="flex-1" 
              disabled={isPreloading || (gameType === 'routes' && isCustomRoutes && !customRouteCount) || (gameType === 'timed' && isCustomDuration && !customDuration)}
            >
              <Wifi className="h-5 w-5 mr-2" />
              Create Online Room
            </Button>
          )}
        </div>
      )}

      {/* Show Back button when no mode selected */}
      {!playMode && (
        <Button variant="outline" onClick={onBack} className="w-full">
          Back
        </Button>
      )}
    </div>
  );
};

export default DuelSetup;
