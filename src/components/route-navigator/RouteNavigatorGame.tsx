import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NavigatorMapView from './NavigatorMapView';
import NavigatorResult from './NavigatorResult';
import {
  NavigatorChallenge,
  DecisionPoint,
  Branch,
  buildAdjacency,
  findStartNode,
  findNextNode,
  validateChallenge,
  isFinishReached,
} from '@/utils/routeNavigatorUtils';
import { Loader2, ArrowLeft, ZoomOut, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GamePhase = 'loading' | 'waiting-image' | 'overview' | 'navigating' | 'result';

interface RouteNavigatorGameProps {
  mapId: string;
  mapName: string;
  sourceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  userId?: string;
  onBack: () => void;
}

const RouteNavigatorGame: React.FC<RouteNavigatorGameProps> = ({
  mapId,
  mapName,
  sourceImageUrl,
  imageWidth,
  imageHeight,
  userId,
  onBack,
}) => {
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [challenges, setChallenges] = useState<NavigatorChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentNode, setCurrentNode] = useState<DecisionPoint | null>(null);
  const [wrongTurns, setWrongTurns] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [wrongBranch, setWrongBranch] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [overviewStartTime, setOverviewStartTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const challenge = challenges[currentIndex] || null;
  const finish = challenge ? { x: challenge.finish_x, y: challenge.finish_y } : { x: 0, y: 0 };
  const start = challenge ? { x: challenge.start_x, y: challenge.start_y } : { x: 0, y: 0 };

  const dpMap = useMemo(() => {
    if (!challenge) return new Map<number, DecisionPoint>();
    return buildAdjacency(challenge.decision_points);
  }, [challenge]);

  // Load challenges
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('route_navigator_challenges')
        .select('*')
        .eq('map_id', mapId)
        .order('challenge_index');

      if (error || !data) {
        console.error('Failed to load navigator challenges:', error);
        return;
      }

      const shuffled = [...data].sort(() => Math.random() - 0.5);
      const mapped: NavigatorChallenge[] = shuffled.map((c: any) => ({
        id: c.id,
        map_id: c.map_id,
        challenge_index: c.challenge_index,
        start_x: Number(c.start_x),
        start_y: Number(c.start_y),
        finish_x: Number(c.finish_x),
        finish_y: Number(c.finish_y),
        bbox: c.bbox as any,
        decision_points: c.decision_points as DecisionPoint[],
        optimal_length: c.optimal_length ? Number(c.optimal_length) : null,
        difficulty_score: c.difficulty_score ? Number(c.difficulty_score) : null,
      }));

      const valid = mapped.filter((ch) => validateChallenge(ch));
      if (valid.length < mapped.length) {
        console.warn(`Skipped ${mapped.length - valid.length} invalid challenges out of ${mapped.length}`);
      }

      setChallenges(valid);
      setCurrentIndex(0);
      setPhase('waiting-image');
    };
    load();
  }, [mapId]);

  // Container size observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // Gate: wait for image + container before entering overview
  useEffect(() => {
    if (phase === 'waiting-image' && imageReady && containerSize.width > 0 && containerSize.height > 0 && challenges.length > 0) {
      setPhase('overview');
      setOverviewStartTime(Date.now());
    }
  }, [phase, imageReady, containerSize, challenges.length]);

  const handleStartNavigation = useCallback(() => {
    if (phase !== 'overview' || !challenge) return;
    const previewDuration = Date.now() - overviewStartTime;
    console.log(`Preview duration: ${previewDuration}ms`);
    
    const startNode = findStartNode(
      challenge.decision_points,
      { x: challenge.start_x, y: challenge.start_y }
    );
    setCurrentNode(startNode);
    setWrongTurns(0);
    setSelectedBranch(null);
    setWrongBranch(null);
    setStartTime(Date.now());
    setIsZoomedOut(false);
    setPhase('navigating');
  }, [phase, challenge, overviewStartTime]);

  const handleImageLoaded = useCallback(() => {
    setImageReady(true);
  }, []);

  const handleBranchSelect = useCallback(
    (branch: Branch) => {
      if (phase !== 'navigating' || selectedBranch !== null || wrongBranch !== null) return;

      // If zoomed out, zoom back in first
      if (isZoomedOut) {
        setIsZoomedOut(false);
        return;
      }

      if (branch.is_correct) {
        setSelectedBranch(branch.to_macro);
        setTimeout(() => {
          const nextNode = findNextNode(dpMap, branch);

          if (isFinishReached(nextNode, branch, finish, imageWidth, imageHeight)) {
            const elapsed = Date.now() - startTime;
            setElapsedMs(elapsed);
            setPhase('result');

            if (userId) {
              supabase.from('route_navigator_attempts').insert({
                user_id: userId,
                challenge_id: challenge?.id,
                map_name: mapName,
                player_path: null,
                is_optimal: wrongTurns === 0,
                wrong_turns: wrongTurns,
                response_time: elapsed,
              }).then(({ error }) => {
                if (error) console.error('Failed to record attempt:', error);
              });
            }
          } else if (nextNode) {
            setCurrentNode(nextNode);
            setSelectedBranch(null);
          } else {
            const elapsed = Date.now() - startTime;
            setElapsedMs(elapsed);
            setPhase('result');
          }
        }, 600);
      } else {
        setWrongBranch(branch.to_macro);
        setWrongTurns((prev) => prev + 1);
        setTimeout(() => {
          setWrongBranch(null);
        }, 1200);
      }
    },
    [phase, selectedBranch, wrongBranch, isZoomedOut, dpMap, startTime, wrongTurns, userId, challenge, mapName, finish, imageWidth, imageHeight]
  );

  const handleNextChallenge = useCallback(() => {
    const nextIdx = (currentIndex + 1) % challenges.length;
    setCurrentIndex(nextIdx);
    setSelectedBranch(null);
    setWrongBranch(null);
    setCurrentNode(null);
    setIsZoomedOut(false);
    setOverviewStartTime(Date.now());
    setPhase('overview');
  }, [currentIndex, challenges.length]);

  const totalDecisionPoints = challenge?.decision_points.length || 0;

  if (phase === 'loading' || (phase === 'waiting-image' && challenges.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <NavigatorResult
        wrongTurns={wrongTurns}
        totalDecisionPoints={totalDecisionPoints}
        timeMs={elapsedMs}
        onNextChallenge={handleNextChallenge}
        onBackToSelector={onBack}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black">
      {containerSize.width > 0 && containerSize.height > 0 && (
        <NavigatorMapView
          imageUrl={sourceImageUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          currentNode={phase === 'overview' ? null : currentNode}
          finish={finish}
          start={start}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          isOverview={phase === 'overview'}
          isZoomedOut={isZoomedOut}
          onBranchSelect={handleBranchSelect}
          selectedBranchId={selectedBranch}
          wrongBranchId={wrongBranch}
          onImageLoaded={handleImageLoaded}
        />
      )}

      {/* Back button */}
      <div className="absolute top-3 left-3 z-20">
        <Button
          variant="secondary"
          size="icon"
          className="bg-background/80 backdrop-blur-sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* HUD overlay */}
      {phase === 'navigating' && (
        <div className="absolute top-3 left-14 right-3 flex justify-between items-start z-20">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium pointer-events-none">
            Wrong turns: {wrongTurns}
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium pointer-events-none">
              ↑ Goal
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/80 backdrop-blur-sm h-8 w-8"
              onClick={() => setIsZoomedOut(prev => !prev)}
            >
              {isZoomedOut ? <ZoomIn className="h-4 w-4" /> : <ZoomOut className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Waiting for image */}
      {phase === 'waiting-image' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Overview with Start button */}
      {phase === 'overview' && challenge && (
        <div className="absolute inset-0 flex items-end justify-center pb-16 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-background/80 backdrop-blur-sm rounded-xl px-6 py-4 text-center pointer-events-none">
              <div className="text-lg font-bold mb-1">Navigate to the finish!</div>
              <div className="text-sm text-muted-foreground">
                Choose the correct path at each junction
              </div>
            </div>
            <Button
              size="lg"
              className="px-10 py-3 text-lg font-bold shadow-lg"
              onClick={handleStartNavigation}
            >
              Start
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteNavigatorGame;
