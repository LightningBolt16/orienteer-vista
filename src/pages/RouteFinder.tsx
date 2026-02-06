import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import RouteFinderGame from '@/components/route-finder/RouteFinderGame';
import RouteFinderMapSelector from '@/components/route-finder/RouteFinderMapSelector';
import Leaderboard from '@/components/Leaderboard';
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
  country_code?: string | null;
  location_name?: string | null;
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Load available maps
  useEffect(() => {
    const loadMaps = async () => {
      setIsLoadingMaps(true);
      try {
        const { data: mapsData, error } = await supabase
          .from('route_finder_maps')
          .select(`
            id,
            name,
            description,
            country_code,
            location_name,
            route_finder_challenges(id)
          `)
          .eq('is_public', true);

        if (error) throw error;

        const mapOptions: MapOption[] = (mapsData || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          country_code: m.country_code,
          location_name: m.location_name,
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

  // Active game in fullscreen mode
  if (gameActive && isFullscreen) {
    return (
      <div 
        ref={gameContainerRef}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Slim Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b h-12 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setGameActive(false);
              setIsFullscreen(false);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          
          <span className="text-sm font-medium">Route Finder</span>
          
          <div className="flex items-center gap-2">
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
              title={t('exitFullscreen')}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-full pt-12">
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

  // Main view with Layout (map selection + optional inline game + leaderboard)
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
                selectedMapId={selectedMapId}
                onSelectMap={setSelectedMapId}
              />
            </CardContent>
          </Card>
        </section>

        {/* Game Section - Shows below map selector when active */}
        {gameActive ? (
          <section className="max-w-4xl mx-auto">
            <div 
              ref={gameContainerRef}
              className="relative"
            >
              {/* Fullscreen Toggle Button */}
              <div className="absolute top-2 right-2 z-20 flex gap-2">
                {isAdmin && (
                  <Button
                    variant={debugMode ? "destructive" : "outline"}
                    size="icon"
                    onClick={() => setDebugMode(!debugMode)}
                    title="Toggle debug mode"
                  >
                    <Bug className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  title={t('enterFullscreen')}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <RouteFinderGame
                  mapId={selectedMapId || undefined}
                  debugMode={debugMode}
                  onGameEnd={(stats) => {
                    console.log('Game ended:', stats);
                  }}
                />
              </div>
            </div>
          </section>
        ) : (
          // Start Game Button when not playing
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => setGameActive(true)}
              disabled={maps.length === 0}
              className="bg-orienteering hover:bg-orienteering/90"
            >
              {selectedMapId 
                ? `Play ${maps.find(m => m.id === selectedMapId)?.name || 'Selected Map'}`
                : 'Start Game'}
            </Button>
          </div>
        )}

        {/* Toggle Leaderboard Button */}
        {!isFullscreen && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              variant={gameActive ? "outline" : "default"}
              className={gameActive ? "" : "bg-orienteering hover:bg-orienteering/90"}
            >
              {showLeaderboard ? 'Hide Leaderboard' : t('leaderboard')}
            </Button>
          </div>
        )}

        {/* Leaderboard Section */}
        {showLeaderboard && !isFullscreen && (
          <section className="max-w-2xl mx-auto animate-fade-in">
            <RouteFinderLeaderboardInline />
          </section>
        )}
      </div>
    </Layout>
  );
};

// Inline leaderboard component for Route Finder
const RouteFinderLeaderboardInline: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const { data: attempts, error } = await supabase
          .from('route_finder_attempts')
          .select('user_id, is_correct, response_time');
        
        if (error) throw error;
        
        if (!attempts || attempts.length === 0) {
          setLeaderboard([]);
          setIsLoading(false);
          return;
        }
        
        // Aggregate by user
        const userStats = new Map<string, { correct: number; total: number; timeSum: number }>();
        
        for (const attempt of attempts) {
          const existing = userStats.get(attempt.user_id) || { correct: 0, total: 0, timeSum: 0 };
          userStats.set(attempt.user_id, {
            correct: existing.correct + (attempt.is_correct ? 1 : 0),
            total: existing.total + 1,
            timeSum: existing.timeSum + (attempt.response_time || 0),
          });
        }
        
        // Get user profiles
        const userIds = Array.from(userStats.keys());
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, name, profile_image')
          .in('user_id', userIds);
        
        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, { name: p.name, profileImage: p.profile_image }])
        );
        
        // Build entries
        const entries: any[] = [];
        for (const [userId, stats] of userStats.entries()) {
          if (stats.total < 3) continue;
          const profile = profileMap.get(userId);
          entries.push({
            id: userId,
            name: profile?.name || 'Unknown',
            accuracy: Math.round((stats.correct / stats.total) * 100),
            speed: Math.round(stats.timeSum / stats.total),
            totalAttempts: stats.total,
            profileImage: profile?.profileImage,
          });
        }
        
        entries.sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
          return a.speed - b.speed;
        });
        
        setLeaderboard(entries.slice(0, 10));
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No leaderboard data yet. Be the first to play!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Route Finder Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                entry.id === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                  index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium">{entry.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-primary font-medium">{entry.accuracy}%</span>
                <span className="text-muted-foreground">{(entry.speed / 1000).toFixed(1)}s</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteFinder;
