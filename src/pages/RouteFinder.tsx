import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import RouteFinderGame from '@/components/route-finder/RouteFinderGame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface MapOption {
  id: string;
  name: string;
  description?: string;
  challenge_count: number;
}

const RouteFinder: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [maps, setMaps] = useState<MapOption[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [gameActive, setGameActive] = useState(false);

  // Load available maps
  useEffect(() => {
    const loadMaps = async () => {
      setIsLoadingMaps(true);
      try {
        // Get maps with challenge counts
        const { data: mapsData, error } = await supabase
          .from('route_finder_maps')
          .select(`
            id,
            name,
            description,
            route_finder_challenges(id)
          `)
          .eq('is_public', true);

        if (error) throw error;

        const mapOptions: MapOption[] = (mapsData || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          challenge_count: m.route_finder_challenges?.length || 0,
        })).filter(m => m.challenge_count > 0);

        setMaps(mapOptions);
      } catch (err) {
        console.error('Error loading maps:', err);
      } finally {
        setIsLoadingMaps(false);
      }
    };

    loadMaps();
  }, []);

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Require authentication
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t('loginRequired')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('loginToPlay')}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {t('signIn')}
          </Button>
        </div>
      </div>
    );
  }

  // Active game view
  if (gameActive) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setGameActive(false)}
          className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <RouteFinderGame
          mapId={selectedMapId || undefined}
          onGameEnd={(stats) => {
            console.log('Game ended:', stats);
          }}
        />
      </div>
    );
  }

  // Map selection view
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Route Finder</h1>
          <p className="text-muted-foreground">
            Draw the shortest route from start to finish. Your path will be compared to the optimal route.
          </p>
        </div>

        {/* Quick play button */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Quick Play</h3>
                <p className="text-sm text-muted-foreground">
                  Random challenges from all maps
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  setSelectedMapId(null);
                  setGameActive(true);
                }}
                disabled={maps.length === 0}
              >
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Map selection */}
        <h2 className="text-xl font-semibold mb-4">Or choose a map</h2>
        
        {isLoadingMaps ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : maps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No maps available yet. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maps.map((map) => (
              <Card
                key={map.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedMapId(map.id);
                  setGameActive(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{map.name}</CardTitle>
                  {map.description && (
                    <CardDescription>{map.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground">
                    {map.challenge_count} challenges
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteFinder;
