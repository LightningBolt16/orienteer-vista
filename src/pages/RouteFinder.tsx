import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import RouteFinderGame from '@/components/route-finder/RouteFinderGame';
import RouteFinderMapSelector from '@/components/route-finder/RouteFinderMapSelector';
import PublishRouteFinderMapDialog from '@/components/route-finder/PublishRouteFinderMapDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import Layout from '@/components/Layout';
import PwtAttribution, { isPwtMap } from '@/components/PwtAttribution';
import { toast as sonnerToast } from 'sonner';

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
  const [privateMaps, setPrivateMaps] = useState<MapOption[]>([]);
  const [communityMaps, setCommunityMaps] = useState<MapOption[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [playButtonAnimating, setPlayButtonAnimating] = useState(false);
  
  // Collapsible sections
  const [privateMapsOpen, setPrivateMapsOpen] = useState(false);
  const [communityMapsOpen, setCommunityMapsOpen] = useState(false);
  
  // Warm-up state - first challenge doesn't count
  const [isWarmUp, setIsWarmUp] = useState(true);
  const [gameKey] = useState(0);

  // Publishing dialog
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingMapId, setPublishingMapId] = useState<string>('');
  const [publishingMapName, setPublishingMapName] = useState<string>('');

  // Determine if a PWT map is selected (for showing footer)
  const selectedMap = selectedMapId ? maps.find(m => m.id === selectedMapId) : null;
  const showPwtFooter = selectedMap ? isPwtMap(selectedMap.name) : maps.some(m => isPwtMap(m.name));

  // Load available maps (official, private, community)
  const loadMaps = useCallback(async () => {
    setIsLoadingMaps(true);
    try {
      // Load official public maps
      const { data: officialData, error: officialError } = await supabase
        .from('route_finder_maps')
        .select(`
          id,
          name,
          description,
          country_code,
          location_name,
          route_finder_challenges(id)
        `)
        .eq('is_public', true)
        .eq('map_category', 'official')
        .eq('is_hidden', false);

      if (officialError) throw officialError;

      const officialMaps: MapOption[] = (officialData || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        country_code: m.country_code,
        location_name: m.location_name,
        challenge_count: m.route_finder_challenges?.length || 0,
      })).filter(m => m.challenge_count > 0);

      setMaps(officialMaps);

      // Load private maps if user is logged in
      if (user) {
        const { data: privateData, error: privateError } = await supabase
          .from('route_finder_maps')
          .select(`
            id,
            name,
            description,
            country_code,
            location_name,
            route_finder_challenges(id)
          `)
          .eq('user_id', user.id)
          .eq('is_public', false);

        if (!privateError && privateData) {
          const userPrivateMaps: MapOption[] = privateData.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            country_code: m.country_code,
            location_name: m.location_name,
            challenge_count: m.route_finder_challenges?.length || 0,
          })).filter(m => m.challenge_count > 0);
          setPrivateMaps(userPrivateMaps);
        }

        // Load community maps (public, community category)
        const { data: communityData, error: communityError } = await supabase
          .from('route_finder_maps')
          .select(`
            id,
            name,
            description,
            country_code,
            location_name,
            route_finder_challenges(id)
          `)
          .eq('is_public', true)
          .eq('map_category', 'community')
          .eq('is_hidden', false);

        if (!communityError && communityData) {
          const commMaps: MapOption[] = communityData.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            country_code: m.country_code,
            location_name: m.location_name,
            challenge_count: m.route_finder_challenges?.length || 0,
          })).filter(m => m.challenge_count > 0);
          setCommunityMaps(commMaps);
        }
      }
    } catch (err) {
      console.error('Error loading maps:', err);
    } finally {
      setIsLoadingMaps(false);
    }
  }, [user]);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  // Pure CSS-based fullscreen toggle - simpler and more reliable
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // CSS-based fullscreen doesn't need native fullscreen event listener

  const handleMapSelect = (mapId: string | null) => {
    if (multiSelectMode && mapId) {
      setSelectedMaps(prev => 
        prev.includes(mapId) 
          ? prev.filter(m => m !== mapId)
          : [...prev, mapId]
      );
    } else {
      setMultiSelectMode(false);
      setSelectedMaps([]);
      setSelectedMapId(mapId);
      setIsWarmUp(true);
    }
  };

  const toggleMultiSelectMode = () => {
    if (multiSelectMode) {
      setSelectedMaps([]);
    }
    setMultiSelectMode(!multiSelectMode);
  };

  const playSelectedMaps = () => {
    if (selectedMaps.length === 0) return;
    
    setPlayButtonAnimating(true);
    setTimeout(() => setPlayButtonAnimating(false), 200);
    
    setSelectedMapId(selectedMaps[0]);
    setIsWarmUp(true);
    
    const allMaps = [...maps, ...privateMaps, ...communityMaps];
    sonnerToast.success(`Playing ${selectedMaps.length} map${selectedMaps.length > 1 ? 's' : ''}`, {
      description: allMaps.filter(m => selectedMaps.includes(m.id)).map(m => m.name).join(', '),
      duration: 3000,
    });
  };

  const handlePublishMap = (mapId: string, mapName: string) => {
    setPublishingMapId(mapId);
    setPublishingMapName(mapName);
    setPublishDialogOpen(true);
  };

  const handlePublished = () => {
    loadMaps();
  };

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

  // Fullscreen mode - game takes over the entire screen
  if (isFullscreen && selectedMapId) {
    return (
      <div 
        ref={gameContainerRef}
        className="fixed inset-0 z-50 bg-black"
      >
        <RouteFinderGame
          key={`game-${selectedMapId}`}
          mapId={selectedMapId || undefined}
          debugMode={debugMode}
          isWarmUp={isWarmUp}
          onWarmUpComplete={() => setIsWarmUp(false)}
          onGameEnd={(stats) => {
            console.log('Game ended:', stats);
          }}
          isFullscreen={true}
          onToggleFullscreen={toggleFullscreen}
          isAdmin={isAdmin}
          onToggleDebug={() => setDebugMode(!debugMode)}
        />
      </div>
    );
  }

  // Main view with Layout
  return (
    <Layout>
      <div className="pb-20 space-y-8">
        {/* Guest Mode Banner */}
        {!user && (
          <section className="max-w-4xl mx-auto">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="flex items-center justify-between py-3 px-4">
                 <span className="text-sm text-amber-800 dark:text-amber-200">
                   {t('signInToSaveProgress')}
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
                onSelectMap={handleMapSelect}
                privateMaps={privateMaps}
                privateMapsOpen={privateMapsOpen}
                onPrivateMapsOpenChange={setPrivateMapsOpen}
                communityMaps={communityMaps}
                communityMapsOpen={communityMapsOpen}
                onCommunityMapsOpenChange={setCommunityMapsOpen}
                multiSelectMode={multiSelectMode}
                selectedMaps={selectedMaps}
                onToggleMultiSelect={toggleMultiSelectMode}
                onPlaySelected={playSelectedMaps}
                playButtonAnimating={playButtonAnimating}
                isLoggedIn={!!user}
                onPublishMap={handlePublishMap}
              />
            </CardContent>
          </Card>
        </section>

        {/* Game Section - Always shows when maps are loaded */}
        {(maps.length > 0 || privateMaps.length > 0 || communityMaps.length > 0) && !isLoadingMaps && (
          <section className="max-w-4xl mx-auto">
            <div className={`bg-black rounded-lg overflow-hidden ${
              isMobile ? 'aspect-[3/4]' : 'aspect-video'
            }`}>
              <RouteFinderGame
                key={`game-${selectedMapId || 'all'}`}
                mapId={selectedMapId || undefined}
                debugMode={debugMode}
                isWarmUp={isWarmUp}
                onWarmUpComplete={() => setIsWarmUp(false)}
                onGameEnd={(stats) => {
                  console.log('Game ended:', stats);
                }}
                isFullscreen={false}
                onToggleFullscreen={toggleFullscreen}
                isAdmin={isAdmin}
                onToggleDebug={() => setDebugMode(!debugMode)}
              />
            </div>
          </section>
        )}

        {/* Toggle Leaderboard Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="bg-orienteering hover:bg-orienteering/90"
          >
            {showLeaderboard ? t('hideLeaderboard') : t('leaderboard')}
          </Button>
        </div>

        {/* Leaderboard Section */}
        {showLeaderboard && (
          <section className="max-w-2xl mx-auto animate-fade-in">
            <RouteFinderLeaderboardInline />
          </section>
        )}

        {/* PWT Attribution Footer */}
        {showPwtFooter && (
          <section className="max-w-lg mx-auto">
            <PwtAttribution variant="footer" />
          </section>
        )}

        {/* Publish Dialog */}
        <PublishRouteFinderMapDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          mapId={publishingMapId}
          mapName={publishingMapName}
          onPublished={handlePublished}
        />
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
