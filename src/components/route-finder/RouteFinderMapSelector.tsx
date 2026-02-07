import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Shuffle, Loader2, Lock, Users, Map, ChevronDown, ChevronUp, Star, Check, Layers, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PwtAttribution, { isPwtMap } from '@/components/PwtAttribution';
import kartkompanietLogo from '@/assets/kartkompaniet-logo.png';
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
  // Private maps
  privateMaps?: MapOption[];
  privateMapsOpen?: boolean;
  onPrivateMapsOpenChange?: (open: boolean) => void;
  // Community maps
  communityMaps?: MapOption[];
  communityMapsOpen?: boolean;
  onCommunityMapsOpenChange?: (open: boolean) => void;
  // Multi-select
  multiSelectMode?: boolean;
  selectedMaps?: string[];
  onToggleMultiSelect?: () => void;
  onPlaySelected?: () => void;
  playButtonAnimating?: boolean;
  // User state
  isLoggedIn?: boolean;
  // Publishing
  onPublishMap?: (mapId: string, mapName: string) => void;
}

const RouteFinderMapSelector: React.FC<RouteFinderMapSelectorProps> = ({
  maps,
  isLoading,
  selectedMapId,
  onSelectMap,
  privateMaps = [],
  privateMapsOpen = false,
  onPrivateMapsOpenChange,
  communityMaps = [],
  communityMapsOpen = false,
  onCommunityMapsOpenChange,
  multiSelectMode = false,
  selectedMaps = [],
  onToggleMultiSelect,
  onPlaySelected,
  playButtonAnimating = false,
  isLoggedIn = false,
  onPublishMap,
}) => {
  const { t } = useLanguage();

  const handleMapClick = (mapName: string | null) => {
    onSelectMap(mapName);
  };

  const isSelected = (mapName: string) => {
    if (multiSelectMode) {
      return selectedMaps.includes(mapName);
    }
    return selectedMapId === mapName;
  };

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
    <div className="space-y-6">
      {/* Multi-Select Toggle and Play Button */}
      {onToggleMultiSelect && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant={multiSelectMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleMultiSelect}
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            {multiSelectMode ? 'Cancel Multi-Select' : 'Multi-Select'}
          </Button>
          
          {multiSelectMode && selectedMaps.length > 0 && onPlaySelected && (
            <Button
              onClick={onPlaySelected}
              className={`gap-2 bg-primary transition-transform duration-150 ${
                playButtonAnimating ? 'scale-95' : 'hover:scale-105'
              }`}
            >
              <Shuffle className={`h-4 w-4 ${playButtonAnimating ? 'animate-spin' : ''}`} />
              Play {selectedMaps.length} Map{selectedMaps.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}

      {multiSelectMode && (
        <p className="text-sm text-muted-foreground">
          Click maps to select them, then press "Play" to combine their challenges into a random mix.
        </p>
      )}

      {/* Official Maps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {/* All Maps Option - Only show when not in multi-select mode */}
        {!multiSelectMode && (
          <button
            onClick={() => handleMapClick(null)}
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
        )}

        {/* Individual Map Options */}
        {maps.map((map) => {
          const flagImage = map.country_code ? COUNTRY_FLAG_IMAGES[map.country_code] : null;
          const isMapSelected = isSelected(map.id);
          const isPwt = isPwtMap(map.name);
          const isErikslund = map.name.toLowerCase().includes('erikslund');
          
          return (
            <button
              key={map.id}
              onClick={() => handleMapClick(map.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                isMapSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
              }`}
            >
              {/* Multi-select checkmark */}
              {multiSelectMode && isMapSelected && (
                <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              {flagImage && (
                <img 
                  src={flagImage} 
                  alt={map.country_code || ''} 
                  className="absolute top-1 right-1 w-5 h-4 object-cover rounded-sm shadow-sm" 
                />
              )}
              {isPwt ? (
                <PwtAttribution variant="badge" className="mb-2" />
              ) : isErikslund ? (
                <img src={kartkompanietLogo} alt="Kartkompaniet" className="h-8 w-8 mb-2 object-contain" />
              ) : (
                <Map className="h-8 w-8 mb-2 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{map.name}</span>
              <span className="text-xs text-muted-foreground">
                {map.challenge_count} challenge{map.challenge_count !== 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Your Private Maps - Collapsible */}
      {isLoggedIn && onPrivateMapsOpenChange && (
        <Collapsible open={privateMapsOpen} onOpenChange={onPrivateMapsOpenChange}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Your Private Maps</span>
                <span className="text-xs text-muted-foreground">({privateMaps.length})</span>
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
            {privateMaps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No private maps yet.</p>
                <p className="text-xs mt-1">Go to My Maps to process Route Finder challenges from your uploaded maps.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* Random Mix for Private Maps - hide in multi-select mode */}
                {!multiSelectMode && privateMaps.length > 1 && (
                  <button
                    onClick={() => handleMapClick('private-all')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                      selectedMapId === 'private-all'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <Shuffle className="h-8 w-8 mb-2 text-primary" />
                    <span className="font-medium text-sm">Random Mix</span>
                    <span className="text-xs text-muted-foreground">All your maps</span>
                  </button>
                )}
                {privateMaps.map((map) => {
                  const isMapSelected = isSelected(map.id);
                  return (
                    <div key={map.id} className="relative">
                      <button
                        onClick={() => handleMapClick(map.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative w-full ${
                          isMapSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                        }`}
                      >
                        {/* Multi-select checkmark */}
                        {multiSelectMode && isMapSelected && (
                          <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <Map className="h-8 w-8 mb-2 text-muted-foreground" />
                        <span className="font-medium text-sm">{map.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {map.challenge_count} challenge{map.challenge_count !== 1 ? 's' : ''}
                        </span>
                      </button>
                      {/* Publish button */}
                      {onPublishMap && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPublishMap(map.id, map.name);
                          }}
                          className="absolute bottom-1 right-1 p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                          title="Publish to community"
                        >
                          <Globe className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Community Maps - Collapsible */}
      {onCommunityMapsOpenChange && (
        <Collapsible open={communityMapsOpen} onOpenChange={onCommunityMapsOpenChange}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto border rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Community Maps</span>
                <span className="text-xs text-muted-foreground">({communityMaps.length})</span>
              </div>
              {communityMapsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="p-3 mb-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Star className="h-3 w-3 inline mr-1 fill-yellow-400 text-yellow-400" />
                Star maps from the browser below to add them here. Stats go to map-specific leaderboards.
              </p>
            </div>
            {communityMaps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No community maps available yet.</p>
                <p className="text-xs mt-1">Publish your private maps to share with others!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {communityMaps.map((map) => {
                  const isMapSelected = isSelected(map.id);
                  return (
                    <button
                      key={map.id}
                      onClick={() => handleMapClick(map.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 relative ${
                        isMapSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                      }`}
                    >
                      {/* Multi-select checkmark */}
                      {multiSelectMode && isMapSelected && (
                        <div className="absolute top-1 left-1 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <Star className="absolute top-1 right-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Users className="h-8 w-8 mb-2 text-muted-foreground" />
                      <span className="font-medium text-sm">{map.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {map.challenge_count} challenge{map.challenge_count !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default RouteFinderMapSelector;
