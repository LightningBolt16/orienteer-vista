import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NavigatorMapView from './NavigatorMapView';
import NavigatorResult from './NavigatorResult';
import NavigatorTutorial, { useNavigatorTutorial } from './NavigatorTutorial';
import {
  NavigatorChallenge,
  DecisionPoint,
  Branch,
  applyCorrectEdgesToGraph,
  buildAdjacency,
  findStartNode,
  mergeDecisionPointGraphs,
  resolveBranchDestination,
  validateChallenge,
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
  const { showTutorial, dismissTutorial } = useNavigatorTutorial();
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [challenges, setChallenges] = useState<NavigatorChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentNode, setCurrentNode] = useState<DecisionPoint | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [overviewStartTime, setOverviewStartTime] = useState(0);
  const [traversedPath, setTraversedPath] = useState<{ x: number; y: number }[]>([]);
  // Track which correct-sequence nodes were visited in order
  const [correctNodesHit, setCorrectNodesHit] = useState<number[]>([]);
  const [fullGraph, setFullGraph] = useState<DecisionPoint[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const challenge = challenges[currentIndex] || null;
  const challengeDecisionPoints = useMemo(() => {
    if (!challenge) return [] as DecisionPoint[];
    if (fullGraph.length === 0) return challenge.decision_points;
    return applyCorrectEdgesToGraph(fullGraph, challenge.decision_points);
  }, [challenge, fullGraph]);
  const finish = challenge ? { x: challenge.finish_x, y: challenge.finish_y } : { x: 0, y: 0 };
  const start = challenge ? { x: challenge.start_x, y: challenge.start_y } : { x: 0, y: 0 };

  // Build the correct node sequence from decision_points
  const correctSequence = useMemo(() => {
    if (!challenge) return [] as number[];
    const dpMap = buildAdjacency(challengeDecisionPoints);
    const startNode = findStartNode(challengeDecisionPoints, { x: challenge.start_x, y: challenge.start_y });
    if (!startNode) return [] as number[];

    const seq: number[] = [];
    const visited = new Set<number>();
    let cur: DecisionPoint | null = startNode;
    while (cur && !visited.has(cur.id)) {
      seq.push(cur.id);
      visited.add(cur.id);
      const correctBranch = cur.branches.find(b => b.is_correct);
      if (!correctBranch) break;
      cur = resolveBranchDestination(dpMap, correctBranch, cur);
    }
    return seq;
  }, [challenge, challengeDecisionPoints]);

  const dpMap = useMemo(() => {
    if (!challenge) return new Map<number, DecisionPoint>();
    return buildAdjacency(challengeDecisionPoints);
  }, [challenge, challengeDecisionPoints]);

  const finishTargetNode = useMemo(() => {
    if (!challenge || challengeDecisionPoints.length === 0) return null;

    if (correctSequence.length > 0) {
      return dpMap.get(correctSequence[correctSequence.length - 1]) ?? null;
    }

    return challengeDecisionPoints.reduce<DecisionPoint | null>((closest, node) => {
      const nodeDist = Math.hypot(node.x - challenge.finish_x, node.y - challenge.finish_y);
      if (!closest) return node;

      const closestDist = Math.hypot(closest.x - challenge.finish_x, closest.y - challenge.finish_y);
      return nodeDist < closestDist ? node : closest;
    }, null);
  }, [challenge, challengeDecisionPoints, correctSequence, dpMap]);

  // Compute the correct path polyline using branch paths for geographic accuracy
  const correctPath = useMemo(() => {
    if (!challenge) return [] as { x: number; y: number }[];
    const points: { x: number; y: number }[] = [{ x: challenge.start_x, y: challenge.start_y }];
    const startNode = findStartNode(challengeDecisionPoints, { x: challenge.start_x, y: challenge.start_y });
    if (!startNode) return points;

    const visited = new Set<number>();
    let cur: DecisionPoint | null = startNode;
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      const correctBranch = cur.branches.find(b => b.is_correct);
      if (!correctBranch) {
        points.push({ x: cur.x, y: cur.y });
        break;
      }
      // Use branch path coordinates for geographic accuracy
      if (correctBranch.path && correctBranch.path.length > 0) {
        for (const p of correctBranch.path) {
          points.push({ x: p.x, y: p.y });
        }
      } else {
        points.push({ x: cur.x, y: cur.y });
      }
      cur = resolveBranchDestination(dpMap, correctBranch, cur);
    }
    points.push({ x: challenge.finish_x, y: challenge.finish_y });
    return points;
  }, [challenge, challengeDecisionPoints, dpMap]);

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

      setFullGraph(mergeDecisionPointGraphs(valid.map((ch) => ch.decision_points)));
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
      challengeDecisionPoints,
      { x: challenge.start_x, y: challenge.start_y }
    );
    setCurrentNode(startNode);
    setSelectedBranch(null);
    setStartTime(Date.now());
    setIsZoomedOut(false);
    setCorrectNodesHit([]);
    // Initialize traversed path with start position and first node
    const pathInit: { x: number; y: number }[] = [{ x: challenge.start_x, y: challenge.start_y }];
    if (startNode) {
      pathInit.push({ x: startNode.x, y: startNode.y });
      // Check if start node is first in correct sequence
      if (correctSequence.length > 0 && startNode.id === correctSequence[0]) {
        setCorrectNodesHit([startNode.id]);
      }
    }
    setTraversedPath(pathInit);
    setPhase('navigating');
  }, [phase, challenge, challengeDecisionPoints, overviewStartTime, correctSequence]);

  const handleImageLoaded = useCallback(() => {
    setImageReady(true);
  }, []);

  const finishGame = useCallback((hits: number[]) => {
    const elapsed = Date.now() - startTime;
    setElapsedMs(elapsed);
    // Add finish point to traversed path
    setTraversedPath(prev => [...prev, finish]);
    setPhase('result');

    const wrongTurns = correctSequence.length - hits.length;

    if (userId) {
      supabase.from('route_navigator_attempts').insert({
        user_id: userId,
        challenge_id: challenge?.id,
        map_name: mapName,
        player_path: null,
        is_optimal: hits.length === correctSequence.length,
        wrong_turns: Math.max(0, wrongTurns),
        response_time: elapsed,
      }).then(({ error }) => {
        if (error) console.error('Failed to record attempt:', error);
      });
    }
  }, [startTime, userId, challenge, mapName, finish, correctSequence]);

  const handleBranchSelect = useCallback(
    (branch: Branch) => {
      if (phase !== 'navigating' || selectedBranch !== null) return;

      if (isZoomedOut) {
        setIsZoomedOut(false);
        return;
      }

      // Free movement — always move to the selected branch's destination
      setSelectedBranch(branch.to_macro);
      setTimeout(() => {
        const nextNode = resolveBranchDestination(dpMap, branch, currentNode);
        const branchEnd = branch.path[branch.path.length - 1] ?? null;
        const finishThreshold = 64;
        const nextNodeAtFinish = Boolean(
          nextNode && finishTargetNode && nextNode.id === finishTargetNode.id
        );
        const nodeNearFinish = Boolean(
          nextNode && Math.hypot(nextNode.x - finish.x, nextNode.y - finish.y) <= finishThreshold
        );
        const branchEndsNearFinish = Boolean(
          branchEnd && Math.hypot(branchEnd.x - finish.x, branchEnd.y - finish.y) <= finishThreshold
        );
        const reachedFinish = nextNodeAtFinish || nodeNearFinish || branchEndsNearFinish;

        // Record branch path coordinates for geographic accuracy
        if (nextNode) {
          setTraversedPath(prev => {
            const newPoints = [...prev];
            if (branch.path && branch.path.length > 0) {
              for (const p of branch.path) {
                newPoints.push({ x: p.x, y: p.y });
              }
            } else {
              newPoints.push({ x: nextNode.x, y: nextNode.y });
            }
            return newPoints;
          });
        }

        // Track correct nodes visited in order
        let updatedHits = correctNodesHit;
        if (nextNode) {
          const nextExpectedIdx = correctNodesHit.length;
          if (nextExpectedIdx < correctSequence.length && nextNode.id === correctSequence[nextExpectedIdx]) {
            updatedHits = [...correctNodesHit, nextNode.id];
            setCorrectNodesHit(updatedHits);
          }
        }

        // Finish only when the player actually reaches the challenge finish area
        if (reachedFinish) {
          finishGame(updatedHits);
        } else if (nextNode) {
          setCurrentNode(nextNode);
          setSelectedBranch(null);
        } else {
          setSelectedBranch(null);
        }
      }, 600);
    },
    [phase, selectedBranch, isZoomedOut, dpMap, correctNodesHit, correctSequence, finish, finishGame, finishTargetNode]
  );

  const handleNextChallenge = useCallback(() => {
    const nextIdx = (currentIndex + 1) % challenges.length;
    setCurrentIndex(nextIdx);
    setSelectedBranch(null);
    setCurrentNode(null);
    setIsZoomedOut(false);
    setTraversedPath([]);
    setCorrectNodesHit([]);
    setOverviewStartTime(Date.now());
    setPhase('overview');
  }, [currentIndex, challenges.length]);

  const totalDecisionPoints = correctSequence.length;

  if (phase === 'loading' || (phase === 'waiting-image' && challenges.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="relative w-full h-screen bg-black">
        <div ref={containerRef} className="absolute inset-0">
          {containerSize.width > 0 && containerSize.height > 0 && (
            <NavigatorMapView
              imageUrl={sourceImageUrl}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              currentNode={null}
              finish={finish}
              start={start}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              isOverview={true}
              onBranchSelect={() => {}}
              onImageLoaded={handleImageLoaded}
              traversedPath={traversedPath}
              correctPath={correctPath}
              showResult={true}
            />
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-4">
          <NavigatorResult
            correctHits={correctNodesHit.length}
            totalCorrectNodes={correctSequence.length}
            timeMs={elapsedMs}
            onNextChallenge={handleNextChallenge}
            onBackToSelector={onBack}
          />
        </div>
      </div>
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
            {correctNodesHit.length}/{correctSequence.length} correct
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
