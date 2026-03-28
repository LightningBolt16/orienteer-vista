import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import RouteNavigatorGame from '@/components/route-navigator/RouteNavigatorGame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, ArrowLeft, Navigation } from 'lucide-react';
import Layout from '@/components/Layout';

interface NavMapOption {
  id: string;
  name: string;
  source_image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  challenge_count: number;
  country_code: string | null;
}

const RouteNavigator: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [maps, setMaps] = useState<NavMapOption[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [selectedMap, setSelectedMap] = useState<NavMapOption | null>(null);

  useEffect(() => {
    const loadMaps = async () => {
      setIsLoadingMaps(true);

      // Load maps
      const { data: mapData, error } = await supabase
        .from('route_navigator_maps')
        .select('id, name, source_image_url, image_width, image_height, country_code, is_hidden')
        .eq('is_hidden', false);

      if (error) {
        console.error('Failed to load navigator maps:', error);
        setIsLoadingMaps(false);
        return;
      }

      // Get challenge counts
      const mapOptions: NavMapOption[] = [];
      for (const m of mapData || []) {
        const { count } = await supabase
          .from('route_navigator_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('map_id', m.id);

        mapOptions.push({
          id: m.id,
          name: m.name,
          source_image_url: m.source_image_url,
          image_width: m.image_width,
          image_height: m.image_height,
          challenge_count: count || 0,
          country_code: m.country_code,
        });
      }

      setMaps(mapOptions.filter((m) => m.challenge_count > 0));
      setIsLoadingMaps(false);
    };

    loadMaps();
  }, []);

  if (selectedMap && selectedMap.source_image_url && selectedMap.image_width && selectedMap.image_height) {
    return (
      <div className="w-full h-screen">
        <RouteNavigatorGame
          mapId={selectedMap.id}
          mapName={selectedMap.name}
          sourceImageUrl={selectedMap.source_image_url}
          imageWidth={selectedMap.image_width}
          imageHeight={selectedMap.image_height}
          userId={user?.id}
          onBack={() => setSelectedMap(null)}
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Navigation className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Route Navigator</h1>
        </div>

        <p className="text-muted-foreground mb-6">
          Navigate turn-by-turn through decision points on the map. Choose the correct direction at each junction to find the shortest path.
        </p>

        {isLoadingMaps ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : maps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No navigator maps available yet. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {maps.map((m) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setSelectedMap(m)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{m.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {m.challenge_count} challenges
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RouteNavigator;
