import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import RouteDrawingCanvas from './RouteDrawingCanvas';
import RouteFinderResult from './RouteFinderResult';
import { 
  scoreByProximity, 
  getScoreFeedback, 
  getPathCoordinates,
  type RouteFinderGraph, 
  type Point, 
  type ImpassabilityMask,
  loadImpassabilityMask 
} from '@/utils/routeFinderUtils';
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
  impassability_mask_path: string | null;
  bbox_width: number | null;
  bbox_height: number | null;
  aspect_ratio: string;
  map_name?: string;
}

interface RouteFinderGameProps {
  mapId?: string;
  debugMode?: boolean;
  isWarmUp?: boolean;
  onWarmUpComplete?: () => void;
  onGameEnd?: (stats: { correct: number; total: number }) => void;
}

const RouteFinderGame: React.FC<RouteFinderGameProps> = ({ 
  mapId, 
  debugMode = false, 
  isWarmUp = false,
  onWarmUpComplete,
  onGameEnd 
}) => {
  const { user, updatePerformance } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    score: number;
    feedback: string;
    userPoints: Point[];
    responseTime: number;
  } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [currentMask, setCurrentMask] = useState<ImpassabilityMask | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

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

      // Transform data to include map name and merge optimal path into graph
      const transformedChallenges = data.map((c: any) => ({
        ...c,
        map_name: c.route_finder_maps?.name,
        // Merge separate columns into the graph_data object
        graph_data: {
          nodes: c.graph_data?.nodes || [],
          edges: c.graph_data?.edges || [],
          start: c.start_node_id,
          finish: c.finish_node_id,
          optimalPath: c.optimal_path || [],
          optimalLength: c.optimal_length || 0,
        } as RouteFinderGraph,
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

  // Load impassability mask when challenge changes
  const currentChallenge = challenges[currentIndex];
  
  useEffect(() => {
    const loadMask = async () => {
      if (!currentChallenge?.impassability_mask_path) {
        setCurrentMask(null);
        return;
      }
      
      const maskUrl = getImageUrl(currentChallenge.impassability_mask_path);
      const mask = await loadImpassabilityMask(maskUrl, 4);
      setCurrentMask(mask);
    };
    
    loadMask();
  }, [currentChallenge?.impassability_mask_path]);

  // Load base image dimensions when challenge changes
  useEffect(() => {
    if (!currentChallenge?.base_image_path) return;

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = getImageUrl(currentChallenge.base_image_path);
  }, [currentChallenge?.base_image_path]);

  // Get storage URL for image
  const getImageUrl = (path: string): string => {
    const { data } = supabase.storage.from('user-route-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // Handle path submission
  const handlePathComplete = async (points: Point[]) => {
    if (!currentChallenge) return;

    const responseTime = Date.now() - startTime;

    // Get optimal path coordinates from graph
    const optimalCoords = getPathCoordinates(
      currentChallenge.graph_data.optimalPath,
      currentChallenge.graph_data
    );

    // Get start and finish markers
    const startNode = currentChallenge.graph_data.nodes.find(
      n => n.id === currentChallenge.start_node_id
    );
    const finishNode = currentChallenge.graph_data.nodes.find(
      n => n.id === currentChallenge.finish_node_id
    );

    if (!startNode || !finishNode) {
      console.error('Could not find start or finish nodes');
      return;
    }

    // Score using proximity-based system
    const result = scoreByProximity(
      points,
      optimalCoords,
      startNode,
      finishNode,
      100 // tolerance radius in pixels
    );

    const feedback = getScoreFeedback(result.score, result.reachedFinish);
    const isCorrect = result.score >= 70; // Consider 70%+ as "correct" for stats

    setLastResult({
      score: result.score,
      feedback,
      userPoints: points,
      responseTime,
    });

    // Only update stats and save if NOT a warm-up round
    if (!isWarmUp) {
      const newStats = {
        correct: stats.correct + (isCorrect ? 1 : 0),
        total: stats.total + 1,
      };
      setStats(newStats);

      // Save attempt to database
      if (user?.id) {
        try {
          await supabase.from('route_finder_attempts').insert([{
            user_id: user.id,
            challenge_id: currentChallenge.id,
            map_name: currentChallenge.map_name || 'Unknown',
            is_correct: isCorrect,
            response_time: responseTime,
            user_path: points as unknown as any,
          }]);

          // Update user performance
          updatePerformance(isCorrect, responseTime);
        } catch (err) {
          console.error('Error saving attempt:', err);
        }
      }
    }

    setShowResult(true);
  };

  // Move to next challenge
  const handleNext = () => {
    setShowResult(false);
    setLastResult(null);
    setCurrentMask(null);

    // If this was a warm-up, notify parent
    if (isWarmUp) {
      onWarmUpComplete?.();
    }

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
        score={lastResult.score}
        feedback={lastResult.feedback}
        responseTime={lastResult.responseTime}
        answerImageUrl={getImageUrl(currentChallenge.answer_image_path)}
        userPoints={lastResult.userPoints}
        onNext={handleNext}
        stats={stats}
        imageDimensions={imageDimensions}
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
        impassabilityMask={currentMask}
        bboxWidth={currentChallenge.bbox_width ?? undefined}
        bboxHeight={currentChallenge.bbox_height ?? undefined}
        debugMode={debugMode}
      />
    </div>
  );
};

export default RouteFinderGame;
