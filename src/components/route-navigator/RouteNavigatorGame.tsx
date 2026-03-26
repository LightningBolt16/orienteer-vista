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
} from '@/utils/routeNavigatorUtils';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GamePhase = 'loading' | 'overview' | 'navigating' | 'result';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

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

      setChallenges(mapped);
      setCurrentIndex(0);
      setPhase('overview');
    };
    load();
  }, [mapId]);

  // Container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Overview → navigating after delay
  useEffect(() => {
    if (phase === 'overview' && challenge) {
      const timer = setTimeout(() => {
        const startNode = findStartNode(
          challenge.decision_points,
          { x: challenge.start_x, y: challenge.start_y }
        );
        setCurrentNode(startNode);
        setWrongTurns(0);
        setSelectedBranch(null);
        setWrongBranch(null);
        setStartTime(Date.now());
        setPhase('navigating');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, challenge]);

  const handleBranchSelect = useCallback(
    (branch: Branch) => {
      if (phase !== 'navigating' || selectedBranch !== null || wrongBranch !== null) return;

      if (branch.is_correct) {
        setSelectedBranch(branch.to_macro);
        setTimeout(() => {
          const nextNode = findNextNode(dpMap, branch);
          if (nextNode && nextNode.branches.length > 0) {
            setCurrentNode(nextNode);
            setSelectedBranch(null);
          } else {
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
    [phase, selectedBranch, wrongBranch, dpMap, startTime, wrongTurns, userId, challenge, mapName]
  );

  const handleNextChallenge = useCallback(() => {
    const nextIdx = (currentIndex + 1) % challenges.length;
    setCurrentIndex(nextIdx);
    setPhase('overview');
  }, [currentIndex, challenges.length]);

  const totalDecisionPoints = challenge?.decision_points.length || 0;

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
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
    <div ref={containerRef} className="relative w-full h-screen">
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
        onBranchSelect={handleBranchSelect}
        selectedBranchId={selectedBranch}
        wrongBranchId={wrongBranch}
      />

      {/* Back button */}
      <div className="absolute top-3 left-3 z-10">
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
        <div className="absolute top-3 left-14 right-3 flex justify-between pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium">
            Wrong turns: {wrongTurns}
          </div>
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium">
            ↑ Goal
          </div>
        </div>
      )}

      {/* Overview info */}
      {phase === 'overview' && challenge && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
            <div className="text-lg font-bold mb-1">Navigate to the finish!</div>
            <div className="text-sm text-muted-foreground">
              Choose the correct path at each junction
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteNavigatorGame;
