import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import RouteFinderGame from '@/components/route-finder/RouteFinderGame';
import RouteFinderMapSelector from '@/components/route-finder/RouteFinderMapSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, Loader2, Bug, Maximize2, Minimize2, LogIn } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import Layout from '@/components/Layout';

interface MapOption {
  id: string;
  name: string;
  description?: string;
  challenge_count: number;
}

const RouteFinder: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [maps, setMaps] = useState<MapOption[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

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

  const toggleFullscreen = useCallback(async () => {
    if (isMobile || !document.fullscreenEnabled) {
      setIsFullscreen(prev => !prev);
      return;
    }

    if (!gameContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await gameContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error, using CSS fallback:', error);
      setIsFullscreen(prev => !prev);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isMobile && document.fullscreenEnabled) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isMobile]);

  // Show loading while checking auth
  if (userLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Active game view - still fullscreen without Layout
  if (gameActive) {
    return (
      <div 
        ref={gameContainerRef}
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full h-[calc(100vh-4rem)]'}`}
      >
        {/* Slim Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b h-12 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGameActive(false)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          
          <span className="text-sm font-medium">Route Finder</span>
          
          <div className="flex items-center gap-2">
            {/* Debug toggle (admin only) */}
            {isAdmin && (
              <Button
                variant={debugMode ? "destructive" : "ghost"}
                size="icon"
                onClick={() => setDebugMode(!debugMode)}
                title="Toggle debug mode"
                className="h-8 w-8"
              >
                <Bug className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
              title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Game Area */}
        <div className={`${isFullscreen ? 'h-full pt-12' : 'h-full pt-12'}`}>
          <RouteFinderGame
            mapId={selectedMapId || undefined}
            debugMode={debugMode}
            onGameEnd={(stats) => {
              console.log('Game ended:', stats);
            }}
          />
        </div>
      </div>
    );
  }

  // Map selection view - with Layout
  return (
    <Layout>
      <div className="pb-20 space-y-8">
        {/* Guest Mode Banner */}
        {!user && (
          <section className="max-w-4xl mx-auto">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  {t('signInToSaveProgress') || 'Sign in to save your progress and appear on the leaderboard'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('signIn')}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
        
        {/* Map Selection Card */}
        <section className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Route Finder</CardTitle>
              <CardDescription>
                Draw the shortest route from start to finish. Your path will be compared to the optimal route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteFinderMapSelector
                maps={maps}
                isLoading={isLoadingMaps}
                onSelectMap={setSelectedMapId}
                onStartGame={() => setGameActive(true)}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default RouteFinder;
