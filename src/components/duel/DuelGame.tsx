import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';
import DuelPlayerPanel from './DuelPlayerPanel';
import DuelScoreBar from './DuelScoreBar';
import { Trophy, RotateCcw, Home, Smartphone, ArrowLeft, ArrowRight } from 'lucide-react';
import { DuelSettings } from './DuelSetup';

interface DuelGameProps {
  routes: RouteData[];
  totalRoutes: number;
  settings: DuelSettings;
  onExit: () => void;
  onRestart: () => void;
}

interface PlayerState {
  score: number;
  pendingScore: number; // Score shown before round ends
  hasAnswered: boolean;
  lastAnswer: 'left' | 'right' | null;
  showResult: 'win' | 'lose' | null;
  resultMessage: string;
  answerTime: number | null;
  currentRouteIndex: number; // For independent continuation
}

const SPEED_BONUS = 0.5;
const WRONG_PENALTY = -0.5;

const DuelGame: React.FC<DuelGameProps> = ({ routes, totalRoutes, settings, onExit, onRestart }) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [routesCompleted, setRoutesCompleted] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [routeStartTime, setRouteStartTime] = useState<number>(Date.now());
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number | null>(settings.gameDuration ?? null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const [player1, setPlayer1] = useState<PlayerState>({
    score: 0,
    pendingScore: 0,
    hasAnswered: false,
    lastAnswer: null,
    showResult: null,
    resultMessage: '',
    answerTime: null,
    currentRouteIndex: 0,
  });
  
  const [player2, setPlayer2] = useState<PlayerState>({
    score: 0,
    pendingScore: 0,
    hasAnswered: false,
    lastAnswer: null,
    showResult: null,
    resultMessage: '',
    answerTime: null,
    currentRouteIndex: 0,
  });

  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const transitionTimeout = useRef<number | null>(null);
  const gameTimerInterval = useRef<number | null>(null);

  const currentRoute = routes[currentRouteIndex % routes.length];
  // Use 16:9 for desktop, 16:9 landscape for mobile too (better for fullscreen)
  const currentImageUrl = currentRoute 
    ? getImageUrlByMapName(currentRoute.mapName || '', currentRoute.candidateIndex, false)
    : '';

  const isTimedMode = settings.gameType === 'timed';

  // Detect mobile and orientation
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Game timer countdown (for timed mode)
  useEffect(() => {
    if (isTimedMode && settings.gameDuration && !gameOver) {
      gameTimerInterval.current = window.setInterval(() => {
        setGameTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            setGameOver(true);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      
      return () => {
        if (gameTimerInterval.current) clearInterval(gameTimerInterval.current);
      };
    }
  }, [isTimedMode, settings.gameDuration, gameOver]);

  // Reset timer on new route
  useEffect(() => {
    setRouteStartTime(Date.now());
  }, [currentRouteIndex]);

  // Preload images
  useEffect(() => {
    if (!currentRoute) return;
    
    const imageUrl = currentImageUrl;
    const existingImg = preloadedImages.current.get(imageUrl);
    
    if (existingImg?.complete) {
      setIsImageLoaded(true);
    } else {
      setIsImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setIsImageLoaded(true);
        preloadedImages.current.set(imageUrl, img);
      };
      img.src = imageUrl;
    }

    // Preload next few images
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentRouteIndex + i) % routes.length;
      const nextRoute = routes[nextIndex];
      const nextUrl = getImageUrlByMapName(nextRoute.mapName || '', nextRoute.candidateIndex, false);
      if (!preloadedImages.current.has(nextUrl)) {
        const img = new Image();
        img.src = nextUrl;
        preloadedImages.current.set(nextUrl, img);
      }
    }

    return () => {
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routes, currentRoute, currentImageUrl]);

  // Handle player answer - DELAYED scoring
  const handlePlayerAnswer = useCallback((player: 1 | 2, direction: 'left' | 'right') => {
    if (isTransitioning || gameOver) return;
    
    const setPlayer = player === 1 ? setPlayer1 : setPlayer2;
    const playerState = player === 1 ? player1 : player2;
    
    if (playerState.hasAnswered) return;
    
    const answerTime = Date.now() - routeStartTime;
    
    // Just mark as answered - don't update score yet!
    setPlayer(prev => ({
      ...prev,
      hasAnswered: true,
      lastAnswer: direction,
      answerTime,
    }));
  }, [isTransitioning, gameOver, player1, player2, routeStartTime]);

  // Process round results - ONLY called when both players have answered
  const processRoundResults = useCallback(() => {
    const p1Correct = player1.lastAnswer === currentRoute?.shortestSide;
    const p2Correct = player2.lastAnswer === currentRoute?.shortestSide;
    
    let p1Score = p1Correct ? 1 : 0;
    let p2Score = p2Correct ? 1 : 0;
    
    // Speed bonus in speed mode
    if (settings.gameMode === 'speed' && p1Correct && p2Correct) {
      if (player1.answerTime && player2.answerTime) {
        if (player1.answerTime < player2.answerTime) {
          p1Score += SPEED_BONUS;
        } else if (player2.answerTime < player1.answerTime) {
          p2Score += SPEED_BONUS;
        }
      }
    }
    
    // Penalty for wrong answers in timed mode
    if (isTimedMode) {
      if (!p1Correct && player1.lastAnswer !== null) p1Score += WRONG_PENALTY;
      if (!p2Correct && player2.lastAnswer !== null) p2Score += WRONG_PENALTY;
    }
    
    // NOW update both scores and pending scores together
    setPlayer1(prev => ({
      ...prev,
      showResult: p1Correct ? 'win' : 'lose',
      resultMessage: p1Correct 
        ? (p1Score > 1 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player1.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p1Score,
      pendingScore: prev.score + p1Score,
    }));
    
    setPlayer2(prev => ({
      ...prev,
      showResult: p2Correct ? 'win' : 'lose',
      resultMessage: p2Correct 
        ? (p2Score > 1 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player2.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p2Score,
      pendingScore: prev.score + p2Score,
    }));
    
    setRoutesCompleted(prev => prev + 1);
    setIsTransitioning(true);
    
    // Move to next route after delay
    transitionTimeout.current = window.setTimeout(() => {
      if (!isTimedMode && currentRouteIndex + 1 >= totalRoutes) {
        setGameOver(true);
      } else {
        setCurrentRouteIndex(prev => prev + 1);
        setPlayer1(prev => ({
          ...prev,
          hasAnswered: false,
          lastAnswer: null,
          showResult: null,
          resultMessage: '',
          answerTime: null,
        }));
        setPlayer2(prev => ({
          ...prev,
          hasAnswered: false,
          lastAnswer: null,
          showResult: null,
          resultMessage: '',
          answerTime: null,
        }));
        setIsImageLoaded(false);
      }
      setIsTransitioning(false);
    }, isTimedMode ? 500 : 1000);
  }, [player1, player2, currentRoute, currentRouteIndex, totalRoutes, settings.gameMode, isTimedMode]);

  // Check if round should end - ONLY when BOTH players answered
  useEffect(() => {
    if (isTransitioning) return;
    
    // Round ends ONLY when both players have answered
    if (player1.hasAnswered && player2.hasAnswered && !player1.showResult) {
      processRoundResults();
    }
  }, [player1.hasAnswered, player2.hasAnswered, player1.showResult, isTransitioning, processRoundResults]);

  // Keyboard controls (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      // Player 1: A/D
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handlePlayerAnswer(1, 'left');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlePlayerAnswer(1, 'right');
      }
      
      // Player 2: Arrow keys
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePlayerAnswer(2, 'left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePlayerAnswer(2, 'right');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerAnswer, gameOver, isMobile]);

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
            <p className="text-muted-foreground">{routesCompleted} routes completed</p>
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

  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64 text-foreground">Loading routes...</div>;
  }

  // Mobile Portrait - Show rotate instruction
  if (isMobile && !isLandscape) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-8 text-center">
        <Smartphone className="h-16 w-16 text-primary mb-4 animate-pulse" style={{ transform: 'rotate(90deg)' }} />
        <h2 className="text-2xl font-bold text-foreground mb-2">Rotate Your Phone</h2>
        <p className="text-muted-foreground mb-6">
          Hold your phone in landscape mode for the best duel experience!
        </p>
        <Button variant="outline" onClick={onExit}>
          <Home className="h-4 w-4 mr-2" />
          Exit Duel
        </Button>
      </div>
    );
  }

  // Mobile Landscape - Fullscreen route with overlayed buttons for each player
  // Player 1 sits at TOP of phone (notch side), Player 2 at BOTTOM (charging port side)
  if (isMobile && isLandscape) {
    const RED_COLOR = '#FF5733';
    const BLUE_COLOR = '#3357FF';
    
    return (
      <div className="fixed inset-0 bg-black">
        {/* Fullscreen Route Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isImageLoaded ? (
            <img
              src={currentImageUrl}
              alt="Route"
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                isTransitioning ? 'opacity-50' : 'opacity-100'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-muted/20 animate-pulse" />
          )}
        </div>

        {/* Center HUD - Timer/Progress and Scores */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-4">
            <div className="text-red-500 font-bold text-lg">
              {player1.score % 1 === 0 ? player1.score : player1.score.toFixed(1)}
            </div>
            <div className="text-white font-mono font-bold text-xl">
              {isTimedMode && gameTimeRemaining !== null ? (
                <span className={gameTimeRemaining < 10 ? 'text-red-400 animate-pulse' : ''}>
                  {Math.floor(gameTimeRemaining / 60)}:{String(Math.floor(gameTimeRemaining % 60)).padStart(2, '0')}
                </span>
              ) : (
                <span>{routesCompleted + 1}/{totalRoutes}</span>
              )}
            </div>
            <div className="text-blue-500 font-bold text-lg">
              {player2.score % 1 === 0 ? player2.score : player2.score.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Exit button */}
        <button 
          onClick={onExit}
          className="absolute top-2 right-2 z-50 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
        >
          Exit
        </button>

        {/* Player 1 buttons - TOP of screen (rotated 180° for user at notch side) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-8" style={{ transform: 'translateX(-50%) rotate(180deg)' }}>
          {/* Result indicator */}
          {player1.showResult && (
            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl font-bold ${player1.showResult === 'win' ? 'text-green-500' : 'text-red-500'}`} style={{ transform: 'translateX(-50%) rotate(180deg)' }}>
              {player1.showResult === 'win' ? '✓' : '✗'}
            </div>
          )}
          {player1.hasAnswered && !player1.showResult && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm" style={{ transform: 'translateX(-50%) rotate(180deg)' }}>Waiting...</div>
          )}
          
          {/* Left button (appears as RIGHT from P1's perspective due to rotation) */}
          <button
            onClick={() => handlePlayerAnswer(1, 'left')}
            disabled={isTransitioning || player1.hasAnswered}
            style={{ backgroundColor: `${RED_COLOR}CC` }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
              player1.hasAnswered ? 'opacity-40' : ''
            }`}
          >
            <ArrowLeft className="h-8 w-8 text-white" />
          </button>
          
          {/* Right button (appears as LEFT from P1's perspective due to rotation) */}
          <button
            onClick={() => handlePlayerAnswer(1, 'right')}
            disabled={isTransitioning || player1.hasAnswered}
            style={{ backgroundColor: `${BLUE_COLOR}CC` }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
              player1.hasAnswered ? 'opacity-40' : ''
            }`}
          >
            <ArrowRight className="h-8 w-8 text-white" />
          </button>
        </div>

        {/* Player 2 buttons - BOTTOM of screen (normal orientation for user at charging port side) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-8">
          {/* Result indicator */}
          {player2.showResult && (
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 text-2xl font-bold ${player2.showResult === 'win' ? 'text-green-500' : 'text-red-500'}`}>
              {player2.showResult === 'win' ? '✓' : '✗'}
            </div>
          )}
          {player2.hasAnswered && !player2.showResult && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">Waiting...</div>
          )}
          
          {/* Left button */}
          <button
            onClick={() => handlePlayerAnswer(2, 'left')}
            disabled={isTransitioning || player2.hasAnswered}
            style={{ backgroundColor: `${RED_COLOR}CC` }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
              player2.hasAnswered ? 'opacity-40' : ''
            }`}
          >
            <ArrowLeft className="h-8 w-8 text-white" />
          </button>
          
          {/* Right button */}
          <button
            onClick={() => handlePlayerAnswer(2, 'right')}
            disabled={isTransitioning || player2.hasAnswered}
            style={{ backgroundColor: `${BLUE_COLOR}CC` }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
              player2.hasAnswered ? 'opacity-40' : ''
            }`}
          >
            <ArrowRight className="h-8 w-8 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop - Split screen with two panels
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Score Bar */}
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
        />
      </div>
      
      {/* Game Area - Split Screen */}
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        <DuelPlayerPanel
          playerNumber={1}
          imageUrl={currentImageUrl}
          isImageLoaded={isImageLoaded}
          showResult={player1.showResult}
          resultMessage={player1.resultMessage}
          isTransitioning={isTransitioning}
          onSelectDirection={(dir) => handlePlayerAnswer(1, dir)}
          disabled={isTransitioning || player1.hasAnswered}
          hasAnswered={player1.hasAnswered && !player1.showResult}
        />
        
        <DuelPlayerPanel
          playerNumber={2}
          imageUrl={currentImageUrl}
          isImageLoaded={isImageLoaded}
          showResult={player2.showResult}
          resultMessage={player2.resultMessage}
          isTransitioning={isTransitioning}
          onSelectDirection={(dir) => handlePlayerAnswer(2, dir)}
          disabled={isTransitioning || player2.hasAnswered}
          hasAnswered={player2.hasAnswered && !player2.showResult}
        />
      </div>

      {/* Exit Button */}
      <div className="absolute top-2 right-2">
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </div>
    </div>
  );
};

export default DuelGame;
