import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import RouteDrawingCanvas from './RouteDrawingCanvas';
import RouteFinderResult from './RouteFinderResult';
import { scoreDrawing, type RouteFinderGraph, type Point } from '@/utils/routeFinderUtils';
import { Loader2 } from 'lucide-react';

interface Challenge {
  id: string;
  map_id: string;
  challenge_index: number;
  graph_data: RouteFinderGraph;
  start_node_id: string;
  finish_node_id: string;
  optimal_path: string[];
  optimal_length: number;
  base_image_path: string;
  answer_image_path: string;
  aspect_ratio: string;
  map_name?: string;
}

interface RouteFinderGameProps {
  mapId?: string;
  onGameEnd?: (stats: { correct: number; total: number }) => void;
}

const RouteFinderGame: React.FC<RouteFinderGameProps> = ({ mapId, onGameEnd }) => {
  const { user, updatePerformance } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    userPath: string[];
    responseTime: number;
  } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Load challenges
  const loadChallenges = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('route_finder_challenges')
        .select(`
          *,
          route_finder_maps!inner(name)
        `);

      if (mapId) {
        query = query.eq('map_id', mapId);
      }

      const { data, error: queryError } = await query.order('challenge_index');

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setError('No challenges available. Check back later!');
        setIsLoading(false);
        return;
      }

      // Transform data to include map name
      const transformedChallenges = data.map((c: any) => ({
        ...c,
        map_name: c.route_finder_maps?.name,
        graph_data: c.graph_data as RouteFinderGraph,
        optimal_path: c.optimal_path as string[],
      }));

      // Shuffle challenges for variety
      const shuffled = [...transformedChallenges].sort(() => Math.random() - 0.5);
      setChallenges(shuffled);
      setStartTime(Date.now());
    } catch (err: any) {
      console.error('Error loading challenges:', err);
      setError(err.message || 'Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Get storage URL for image
  const getImageUrl = (path: string): string => {
    const { data } = supabase.storage.from('user-route-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // Handle path submission
  const handlePathComplete = async (points: Point[]) => {
    const currentChallenge = challenges[currentIndex];
    if (!currentChallenge) return;

    const responseTime = Date.now() - startTime;

    // Score the drawing
    const result = scoreDrawing(points, currentChallenge.graph_data);

    setLastResult({
      isCorrect: result.isCorrect,
      userPath: result.snappedPath,
      responseTime,
    });

    // Update stats
    const newStats = {
      correct: stats.correct + (result.isCorrect ? 1 : 0),
      total: stats.total + 1,
    };
    setStats(newStats);

    // Save attempt to database
    if (user?.id) {
      try {
        await supabase.from('route_finder_attempts').insert({
          user_id: user.id,
          challenge_id: currentChallenge.id,
          map_name: currentChallenge.map_name || 'Unknown',
          is_correct: result.isCorrect,
          response_time: responseTime,
          user_path: result.snappedPath,
        });

        // Update user performance
        updatePerformance(result.isCorrect, responseTime);
      } catch (err) {
        console.error('Error saving attempt:', err);
      }
    }

    setShowResult(true);
  };

  // Move to next challenge
  const handleNext = () => {
    setShowResult(false);
    setLastResult(null);

    if (currentIndex + 1 >= challenges.length) {
      // Game complete
      onGameEnd?.(stats);
      // Reload challenges for continuous play
      setCurrentIndex(0);
      loadChallenges();
    } else {
      setCurrentIndex(currentIndex + 1);
      setStartTime(Date.now());
    }
  };

  // Current challenge
  const currentChallenge = challenges[currentIndex];

  // Find start and finish markers from graph
  const startMarker = currentChallenge?.graph_data?.nodes?.find(
    n => n.id === currentChallenge.start_node_id
  );
  const finishMarker = currentChallenge?.graph_data?.nodes?.find(
    n => n.id === currentChallenge.finish_node_id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading challenges...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!currentChallenge) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">No challenges available</p>
      </div>
    );
  }

  if (showResult && lastResult) {
    return (
      <RouteFinderResult
        isCorrect={lastResult.isCorrect}
        responseTime={lastResult.responseTime}
        answerImageUrl={getImageUrl(currentChallenge.answer_image_path)}
        userPath={lastResult.userPath}
        optimalPath={currentChallenge.optimal_path}
        graph={currentChallenge.graph_data}
        onNext={handleNext}
        stats={stats}
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Progress indicator */}
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-sm font-medium">
          {currentIndex + 1} / {challenges.length}
        </span>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-sm font-medium text-green-500">{stats.correct}</span>
        <span className="text-sm text-muted-foreground"> / {stats.total}</span>
      </div>

      {/* Map name */}
      {currentChallenge.map_name && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-sm font-medium">{currentChallenge.map_name}</span>
        </div>
      )}

      {/* Drawing canvas */}
      <RouteDrawingCanvas
        imageUrl={getImageUrl(currentChallenge.base_image_path)}
        onPathComplete={handlePathComplete}
        disabled={showResult}
        startMarker={startMarker}
        finishMarker={finishMarker}
      />
    </div>
  );
};

export default RouteFinderGame;
