import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Shuffle, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

interface MapOption {
  id: string;
  name: string;
  description?: string;
  challenge_count: number;
}

interface RouteFinderMapSelectorProps {
  maps: MapOption[];
  isLoading: boolean;
  onSelectMap: (mapId: string | null) => void;
  onStartGame: () => void;
}

const RouteFinderMapSelector: React.FC<RouteFinderMapSelectorProps> = ({
  maps,
  isLoading,
  onSelectMap,
  onStartGame,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading maps...
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
      {/* Quick Play & Leaderboard Row */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={() => {
            onSelectMap(null);
            onStartGame();
          }}
          className="gap-2"
        >
          <Shuffle className="h-4 w-4" />
          Quick Play
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/route-finder/leaderboard')}
          className="gap-2"
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </Button>
      </div>

      {/* Map Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {maps.map((map) => (
          <button
            key={map.id}
            onClick={() => {
              onSelectMap(map.id);
              onStartGame();
            }}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50 border-border bg-card"
          >
            <MapPin className="h-8 w-8 mb-2 text-primary" />
            <span className="font-medium text-sm">{map.name}</span>
            <span className="text-xs text-muted-foreground">
              {map.challenge_count} challenge{map.challenge_count !== 1 ? 's' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RouteFinderMapSelector;
