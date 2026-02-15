import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import RouteDrawingCanvas, { type RouteDrawingCanvasHandle } from './RouteDrawingCanvas';
import RouteFinderResult from './RouteFinderResult';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Check, Maximize2, Minimize2, Bug, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
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
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isAdmin?: boolean;
  onToggleDebug?: () => void;
}

const RouteFinderGame: React.FC<RouteFinderGameProps> = ({ 
  mapId, 
  debugMode = false, 
  isWarmUp = false,
  onWarmUpComplete,
  onGameEnd,
  isFullscreen = false,
  onToggleFullscreen,
  isAdmin = false,
  onToggleDebug,
}) => {
  const { user } = useUser();
  const { t } = useLanguage();
  const canvasRef = useRef<RouteDrawingCanvasHandle>(null);
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
  const [showImpassableWarning, setShowImpassableWarning] = useState(false);
  const [canvasState, setCanvasState] = useState({ hasDrawing: false, canUndo: false });

  // Poll canvas state for button enable/disable
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        setCanvasState({
          hasDrawing: canvasRef.current.hasDrawing,
          canUndo: canvasRef.current.canUndo,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

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
      } else {
        // When loading all maps, exclude hidden maps
        query = query.eq('route_finder_maps.is_hidden', false);
      }

      const { data, error: queryError } = await query.order('challenge_index');

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setError('No challenges available. Check back later!');
        setIsLoading(false);
        return;
      }

      const transformedChallenges = data.map((c: any) => ({
        ...c,
        map_name: c.route_finder_maps?.name,
        graph_data: {
          nodes: c.graph_data?.nodes || [],
          edges: c.graph_data?.edges || [],
          start: c.start_node_id,
          finish: c.finish_node_id,
          optimalPath: c.optimal_path || [],
          optimalLength: c.optimal_length || 0,
        } as RouteFinderGraph,
      }));

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

  useEffect(() => {
    if (!currentChallenge?.base_image_path) return;

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = getImageUrl(currentChallenge.base_image_path);
  }, [currentChallenge?.base_image_path]);

  const getImageUrl = (path: string): string => {
    const { data } = supabase.storage.from('user-route-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePathComplete = async (points: Point[]) => {
    if (!currentChallenge) return;

    const responseTime = Date.now() - startTime;

    const optimalCoords = getPathCoordinates(
      currentChallenge.graph_data.optimalPath,
      currentChallenge.graph_data
    );

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

    const result = scoreByProximity(points, optimalCoords, startNode, finishNode, 100);
    const feedback = getScoreFeedback(result.score, result.reachedFinish);
    const isCorrect = result.score >= 70;

    setLastResult({
      score: result.score,
      feedback,
      userPoints: points,
      responseTime,
    });

    if (!isWarmUp) {
      const newStats = {
        correct: stats.correct + (isCorrect ? 1 : 0),
        total: stats.total + 1,
      };
      setStats(newStats);

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
        } catch (err) {
          console.error('Error saving attempt:', err);
        }
      }
    }

    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    setLastResult(null);
    setCurrentMask(null);

    if (isWarmUp) {
      onWarmUpComplete?.();
    }

    if (currentIndex + 1 >= challenges.length) {
      onGameEnd?.(stats);
      setCurrentIndex(0);
      loadChallenges();
    } else {
      setCurrentIndex(currentIndex + 1);
      setStartTime(Date.now());
    }
  };

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
    <div className="flex flex-col w-full h-full bg-background">
      {/* Top bar - outside the map */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 shrink-0">
        {/* Left: progress + warm-up */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground font-medium">
            {currentIndex + 1}/{challenges.length}
          </span>
          {isWarmUp && (
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              {t('warmUpRound')}
            </span>
          )}
        </div>

        {/* Center: map name + impassable warning */}
        <div className="flex items-center gap-2 justify-center flex-1">
          {currentChallenge.map_name && !showImpassableWarning && (
            <span className="text-sm text-foreground font-medium">
              {currentChallenge.map_name}
            </span>
          )}
          {showImpassableWarning && (
            <div className="flex items-center gap-1.5 text-destructive animate-in fade-in duration-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {t('impassableTerrain')}
              </span>
            </div>
          )}
        </div>

        {/* Right: stats + controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            <span className="text-green-600 dark:text-green-400">{stats.correct}</span>
            <span className="text-muted-foreground">/{stats.total}</span>
          </span>
          {isAdmin && onToggleDebug && (
            <Button
              variant={debugMode ? "destructive" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onToggleDebug(); }}
            >
              <Bug className="h-4 w-4" />
            </Button>
          )}
          {onToggleFullscreen && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Map area - takes remaining space */}
      <div className="flex-1 relative min-h-0">
        <RouteDrawingCanvas
          ref={canvasRef}
          imageUrl={getImageUrl(currentChallenge.base_image_path)}
          onPathComplete={handlePathComplete}
          disabled={showResult}
          startMarker={startMarker}
          finishMarker={finishMarker}
          impassabilityMask={currentMask}
          bboxWidth={currentChallenge.bbox_width ?? undefined}
          bboxHeight={currentChallenge.bbox_height ?? undefined}
          debugMode={debugMode}
          graphNodes={debugMode ? currentChallenge.graph_data.nodes : undefined}
          onImpassableWarning={setShowImpassableWarning}
          showImpassableVignette={showImpassableWarning}
        />
      </div>

      {/* Bottom bar - drawing controls, centered, outside the map */}
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-border bg-muted/50 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); canvasRef.current?.undo(); }}
          disabled={showResult || !canvasState.canUndo}
        >
          <Undo2 className="h-4 w-4 mr-1.5" />
          {t('undo')}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); canvasRef.current?.clear(); }}
          disabled={showResult || !canvasState.hasDrawing}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          {t('clear')}
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={(e) => { e.stopPropagation(); canvasRef.current?.submit(); }}
          disabled={showResult || !canvasState.canUndo}
        >
          <Check className="h-4 w-4 mr-1.5" />
          {t('submit')}
        </Button>
      </div>
    </div>
  );
};

export default RouteFinderGame;
