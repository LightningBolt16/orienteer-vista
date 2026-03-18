import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';
import DuelPlayerPanel from './DuelPlayerPanel';
import DuelScoreBar from './DuelScoreBar';
import MobileDuelView from './MobileDuelView';
import MobileDuelIndependentView from './MobileDuelIndependentView';
import OnlineDuelGameView from './OnlineDuelGameView';
import DuelCountdown from './DuelCountdown';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { DuelSettings } from './DuelSetup';
import { OnlineDuelRoom } from '@/hooks/useOnlineDuel';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnlineDuelHook {
  room: OnlineDuelRoom | null;
  isHost: boolean;
  playerSlot: 'host' | 'guest' | 'player_3' | 'player_4' | null;
  playerId: string | null;
  submitAnswer: (routeIndex: number, answer: string, answerTimeMs: number, isCorrect: boolean) => Promise<void>;
  finishGame: () => Promise<void>;
  restartGame?: (newRoutes: RouteData[]) => Promise<boolean>;
}

interface DuelGameProps {
  routes: RouteData[];
  totalRoutes: number;
  settings: DuelSettings;
  onExit: () => void;
  onRestart: () => void;
  onlineDuel?: OnlineDuelHook;
}

interface PlayerState {
  score: number;
  pendingScore: number;
  hasAnswered: boolean;
  lastAnswer: number | null;
  showResult: 'win' | 'lose' | null;
  resultMessage: string;
  answerTime: number | null;
  currentRouteIndex: number;
  routeStartTime: number;
  isTransitioning: boolean;
}

const SPEED_BONUS = 0.5;
const WRONG_PENALTY = -0.5;

/** Get the correct answer index for a route */
const getCorrectIndex = (route: RouteData): number => {
  return route.mainRouteIndex ?? (route.shortestSide === 'left' ? 0 : 1);
};

/** Get the number of answer options for a route */
const getRouteOptionCount = (route: RouteData): number => {
  return 1 + (route.numAlternates || 1);
};

const DuelGame: React.FC<DuelGameProps> = ({ routes, totalRoutes, settings, onExit, onRestart, onlineDuel }) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [routesCompleted, setRoutesCompleted] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [routeStartTime, setRouteStartTime] = useState<number>(Date.now());
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number | null>(settings.gameDuration ?? null);
  const [showCountdown, setShowCountdown] = useState(true);
  
  const isMobile = useIsMobile();
  
  const activeRoom = onlineDuel?.room;
  const isHost = onlineDuel?.isHost ?? false;
  
  const isIndependentMode = settings.gameMode === 'speed';
  const isOnlineMode = settings.isOnline && activeRoom;
  
  const [player1, setPlayer1] = useState<PlayerState>({
    score: 0, pendingScore: 0, hasAnswered: false, lastAnswer: null,
    showResult: null, resultMessage: '', answerTime: null,
    currentRouteIndex: 0, routeStartTime: Date.now(), isTransitioning: false,
  });
  
  const [player2, setPlayer2] = useState<PlayerState>({
    score: 0, pendingScore: 0, hasAnswered: false, lastAnswer: null,
    showResult: null, resultMessage: '', answerTime: null,
    currentRouteIndex: 0, routeStartTime: Date.now(), isTransitioning: false,
  });

  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const transitionTimeout = useRef<number | null>(null);
  const gameTimerInterval = useRef<number | null>(null);

  const currentRoute = routes[currentRouteIndex % routes.length];
  
  const player1Route = isIndependentMode 
    ? routes[player1.currentRouteIndex % routes.length]
    : currentRoute;
  const player2Route = isIndependentMode 
    ? routes[player2.currentRouteIndex % routes.length]
    : currentRoute;
  
  const getImageUrl = (route: RouteData | undefined): string => {
    if (!route) return '';
    if (route.imagePath) return route.imagePath;
    return getImageUrlByMapName(route.mapName || '', route.candidateIndex, isMobile);
  };
    
  const currentImageUrl = getImageUrl(currentRoute);
  const player1ImageUrl = getImageUrl(player1Route);
  const player2ImageUrl = getImageUrl(player2Route);

  const isTimedMode = settings.gameType === 'timed';

  // Game timer countdown
  useEffect(() => {
    if (showCountdown) return;
    if (isTimedMode && settings.gameDuration && !gameOver) {
      gameTimerInterval.current = window.setInterval(() => {
        setGameTimeRemaining(prev => {
          if (prev === null || prev <= 0) { setGameOver(true); return 0; }
          return prev - 0.1;
        });
      }, 100);
      return () => { if (gameTimerInterval.current) clearInterval(gameTimerInterval.current); };
    }
  }, [isTimedMode, settings.gameDuration, gameOver, showCountdown]);

  // Check if BOTH players finished all routes in fixed-routes speed mode
  useEffect(() => {
    if (isIndependentMode && settings.gameType === 'routes' && !gameOver) {
      if (player1.currentRouteIndex >= totalRoutes && player2.currentRouteIndex >= totalRoutes) {
        setGameOver(true);
      }
    }
  }, [player1.currentRouteIndex, player2.currentRouteIndex, totalRoutes, isIndependentMode, settings.gameType, gameOver]);

  useEffect(() => { setRouteStartTime(Date.now()); }, [currentRouteIndex]);

  // Preload images
  useEffect(() => {
    if (!currentRoute) return;
    const imageUrl = currentImageUrl;
    const existingImg = preloadedImages.current.get(imageUrl);
    if (existingImg?.complete) { setIsImageLoaded(true); }
    else {
      setIsImageLoaded(false);
      const img = new Image();
      img.onload = () => { setIsImageLoaded(true); preloadedImages.current.set(imageUrl, img); };
      img.src = imageUrl;
    }
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentRouteIndex + i) % routes.length;
      const nextRoute = routes[nextIndex];
      const nextUrl = getImageUrl(nextRoute);
      if (!preloadedImages.current.has(nextUrl)) {
        const img = new Image(); img.src = nextUrl;
        preloadedImages.current.set(nextUrl, img);
      }
    }
    return () => { if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current); };
  }, [currentRouteIndex, routes, currentRoute, currentImageUrl]);

  // Handle player answer with numeric index
  const handlePlayerAnswer = useCallback((player: 1 | 2, answerIndex: number) => {
    if (gameOver) return;
    
    const setPlayer = player === 1 ? setPlayer1 : setPlayer2;
    const playerState = player === 1 ? player1 : player2;
    
    if (isIndependentMode) {
      if (playerState.isTransitioning || playerState.hasAnswered) return;
    } else {
      if (isTransitioning || playerState.hasAnswered) return;
    }
    
    const playerRoute = isIndependentMode 
      ? routes[playerState.currentRouteIndex % routes.length]
      : currentRoute;
    
    const answerTime = isIndependentMode 
      ? Date.now() - playerState.routeStartTime
      : Date.now() - routeStartTime;
    
    if (isIndependentMode && playerRoute) {
      const isCorrect = answerIndex === getCorrectIndex(playerRoute);
      let scoreChange = isCorrect ? 1 : WRONG_PENALTY;
      
      setPlayer(prev => ({
        ...prev, hasAnswered: true, lastAnswer: answerIndex, answerTime,
        showResult: isCorrect ? 'win' : 'lose',
        resultMessage: isCorrect ? 'Correct!' : 'Wrong!',
        score: prev.score + scoreChange, pendingScore: prev.score + scoreChange,
        isTransitioning: true,
      }));
      
      setTimeout(() => {
        setPlayer(prev => ({
          ...prev, currentRouteIndex: prev.currentRouteIndex + 1,
          hasAnswered: false, lastAnswer: null, showResult: null, resultMessage: '',
          answerTime: null, routeStartTime: Date.now(), isTransitioning: false,
        }));
      }, 300);
    } else {
      setPlayer(prev => ({ ...prev, hasAnswered: true, lastAnswer: answerIndex, answerTime }));
    }
  }, [isTransitioning, gameOver, player1, player2, routeStartTime, routes, currentRoute, isIndependentMode]);

  // Process round results - ONLY for synchronized mode
  const processRoundResults = useCallback(() => {
    if (isIndependentMode) return;
    
    const correctIndex = getCorrectIndex(currentRoute);
    const p1Correct = player1.lastAnswer === correctIndex;
    const p2Correct = player2.lastAnswer === correctIndex;
    
    let p1Score = p1Correct ? 1 : 0;
    let p2Score = p2Correct ? 1 : 0;
    
    if (p1Correct && p2Correct) {
      if (player1.answerTime && player2.answerTime) {
        if (player1.answerTime < player2.answerTime) p1Score += SPEED_BONUS;
        else if (player2.answerTime < player1.answerTime) p2Score += SPEED_BONUS;
      }
    }
    
    if (isTimedMode) {
      if (!p1Correct && player1.lastAnswer !== null) p1Score += WRONG_PENALTY;
      if (!p2Correct && player2.lastAnswer !== null) p2Score += WRONG_PENALTY;
    }
    
    setPlayer1(prev => ({
      ...prev,
      showResult: p1Correct ? 'win' : 'lose',
      resultMessage: p1Correct 
        ? (p1Score > 1 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player1.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p1Score, pendingScore: prev.score + p1Score,
    }));
    
    setPlayer2(prev => ({
      ...prev,
      showResult: p2Correct ? 'win' : 'lose',
      resultMessage: p2Correct 
        ? (p2Score > 1 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player2.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p2Score, pendingScore: prev.score + p2Score,
    }));
    
    setRoutesCompleted(prev => prev + 1);
    setIsTransitioning(true);
    
    transitionTimeout.current = window.setTimeout(() => {
      if (!isTimedMode && currentRouteIndex + 1 >= totalRoutes) {
        setGameOver(true);
      } else {
        setCurrentRouteIndex(prev => prev + 1);
        setPlayer1(prev => ({ ...prev, hasAnswered: false, lastAnswer: null, showResult: null, resultMessage: '', answerTime: null }));
        setPlayer2(prev => ({ ...prev, hasAnswered: false, lastAnswer: null, showResult: null, resultMessage: '', answerTime: null }));
        setIsImageLoaded(false);
      }
      setIsTransitioning(false);
    }, isTimedMode ? 500 : 1000);
  }, [player1, player2, currentRoute, currentRouteIndex, totalRoutes, settings.gameMode, isTimedMode, isIndependentMode]);

  // Check if round should end
  useEffect(() => {
    if (isTransitioning || isIndependentMode) return;
    if (player1.hasAnswered && player2.hasAnswered && !player1.showResult) {
      processRoundResults();
    }
  }, [player1.hasAnswered, player2.hasAnswered, player1.showResult, isTransitioning, processRoundResults, isIndependentMode]);

  // Keyboard controls (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      // Get current route for the relevant player to check option count
      const p1Route = isIndependentMode ? routes[player1.currentRouteIndex % routes.length] : currentRoute;
      const p2Route = isIndependentMode ? routes[player2.currentRouteIndex % routes.length] : currentRoute;
      const p1Options = p1Route ? getRouteOptionCount(p1Route) : 2;
      const p2Options = p2Route ? getRouteOptionCount(p2Route) : 2;
      
      // Player 1: A/D + W/S
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); handlePlayerAnswer(1, 0); }
      else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handlePlayerAnswer(1, 1); }
      else if ((e.key === 'w' || e.key === 'W') && p1Options >= 3) { e.preventDefault(); handlePlayerAnswer(1, 2); }
      else if ((e.key === 's' || e.key === 'S') && p1Options >= 4) { e.preventDefault(); handlePlayerAnswer(1, 3); }
      
      // Player 2: Arrow keys
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePlayerAnswer(2, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handlePlayerAnswer(2, 1); }
      else if (e.key === 'ArrowUp' && p2Options >= 3) { e.preventDefault(); handlePlayerAnswer(2, 2); }
      else if (e.key === 'ArrowDown' && p2Options >= 4) { e.preventDefault(); handlePlayerAnswer(2, 3); }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerAnswer, gameOver, isMobile, isIndependentMode, routes, player1.currentRouteIndex, player2.currentRouteIndex, currentRoute]);

  if (showCountdown) {
    return <DuelCountdown onComplete={() => setShowCountdown(false)} />;
  }

  // Game Over Screen
  if (gameOver) {
    const winner = player1.score > player2.score ? 1 : player2.score > player1.score ? 2 : 0;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 text-center">
          <Trophy className={`h-20 w-20 mx-auto ${
            winner === 1 ? 'text-red-500' : winner === 2 ? 'text-blue-500' : 'text-yellow-500'
          }`} />
          
          <h2 className="text-3xl font-bold text-foreground">
            {winner === 0 ? "It's a Tie!" : `Player ${winner} Wins!`}
          </h2>
          
          {isTimedMode && (
            <p className="text-muted-foreground">
              {isIndependentMode 
                ? `P1: ${player1.currentRouteIndex} routes | P2: ${player2.currentRouteIndex} routes`
                : `${routesCompleted} routes completed`
              }
            </p>
          )}
          
          <div className="flex justify-center gap-8 text-2xl font-bold">
            <div className="text-red-500">
              P1: {player1.score % 1 === 0 ? player1.score : player1.score.toFixed(1)}
            </div>
            <div className="text-muted-foreground">-</div>
            <div className="text-blue-500">
              P2: {player2.score % 1 === 0 ? player2.score : player2.score.toFixed(1)}
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={onExit} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <Button onClick={onRestart} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Rematch
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Online Mode
  if (isOnlineMode && activeRoom && onlineDuel) {
    return (
      <OnlineDuelGameView
        routes={routes}
        room={activeRoom}
        playerSlot={onlineDuel.playerSlot || 'host'}
        isMobile={isMobile}
        onAnswer={onlineDuel.submitAnswer}
        onExit={onExit}
        onFinishGame={onlineDuel.finishGame}
        onRematch={onRestart}
      />
    );
  }

  // Mobile Mode
  if (isMobile) {
    if (isIndependentMode) {
      return (
        <MobileDuelIndependentView
          routes={routes}
          player1={{
            score: player1.score, currentRouteIndex: player1.currentRouteIndex,
            isTransitioning: player1.isTransitioning, showResult: player1.showResult,
          }}
          player2={{
            score: player2.score, currentRouteIndex: player2.currentRouteIndex,
            isTransitioning: player2.isTransitioning, showResult: player2.showResult,
          }}
          gameTimeRemaining={gameTimeRemaining}
          totalRoutes={totalRoutes}
          onPlayerAnswer={handlePlayerAnswer}
          onExit={onExit}
        />
      );
    }
    
    return (
      <MobileDuelView
        currentRoute={currentRoute}
        player1={{
          score: player1.score, hasAnswered: player1.hasAnswered,
          showResult: player1.showResult, isTransitioning: player1.isTransitioning,
        }}
        player2={{
          score: player2.score, hasAnswered: player2.hasAnswered,
          showResult: player2.showResult, isTransitioning: player2.isTransitioning,
        }}
        isImageLoaded={isImageLoaded}
        isTransitioning={isTransitioning}
        gameTimeRemaining={gameTimeRemaining}
        isTimedMode={isTimedMode}
        routesCompleted={routesCompleted}
        totalRoutes={totalRoutes}
        onPlayerAnswer={handlePlayerAnswer}
        onExit={onExit}
      />
    );
  }

  // Desktop - Split screen with two panels
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="p-2">
        <DuelScoreBar 
          player1Score={player1.score}
          player2Score={player2.score}
          player1PendingScore={player1.pendingScore}
          player2PendingScore={player2.pendingScore}
          totalRoutes={totalRoutes}
          currentRoute={currentRouteIndex}
          gameTimeRemaining={gameTimeRemaining}
          isTimedMode={isTimedMode}
          routesCompleted={routesCompleted}
          gameMode={settings.gameMode}
          isOnline={settings.isOnline}
        />
      </div>
      
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        <DuelPlayerPanel
          playerNumber={1}
          imageUrl={isIndependentMode ? player1ImageUrl : currentImageUrl}
          isImageLoaded={isImageLoaded}
          showResult={player1.showResult}
          resultMessage={player1.resultMessage}
          isTransitioning={isIndependentMode ? player1.isTransitioning : isTransitioning}
          onSelectAnswer={(idx) => handlePlayerAnswer(1, idx)}
          disabled={isIndependentMode ? player1.isTransitioning : (isTransitioning || player1.hasAnswered)}
          hasAnswered={!isIndependentMode && player1.hasAnswered && !player1.showResult}
          totalOptions={getRouteOptionCount(isIndependentMode ? player1Route : currentRoute)}
        />
        
        <DuelPlayerPanel
          playerNumber={2}
          imageUrl={isIndependentMode ? player2ImageUrl : currentImageUrl}
          isImageLoaded={isImageLoaded}
          showResult={player2.showResult}
          resultMessage={player2.resultMessage}
          isTransitioning={isIndependentMode ? player2.isTransitioning : isTransitioning}
          onSelectAnswer={(idx) => handlePlayerAnswer(2, idx)}
          disabled={isIndependentMode ? player2.isTransitioning : (isTransitioning || player2.hasAnswered)}
          hasAnswered={!isIndependentMode && player2.hasAnswered && !player2.showResult}
          totalOptions={getRouteOptionCount(isIndependentMode ? player2Route : currentRoute)}
        />
      </div>

      <div className="absolute top-2 right-2">
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </div>
    </div>
  );
};

export default DuelGame;
