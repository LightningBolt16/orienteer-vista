import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { useLanguage } from '../../context/LanguageContext';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';
import DuelPlayerPanel from './DuelPlayerPanel';
import DuelScoreBar from './DuelScoreBar';
import { Trophy, RotateCcw, Home } from 'lucide-react';
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
  hasAnswered: boolean;
  lastAnswer: 'left' | 'right' | null;
  showResult: 'win' | 'lose' | null;
  resultMessage: string;
  answerTime: number | null;
}

const SPEED_BONUS = 0.5; // Bonus points for being faster

const DuelGame: React.FC<DuelGameProps> = ({ routes, totalRoutes, settings, onExit, onRestart }) => {
  const { t } = useLanguage();
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [routeStartTime, setRouteStartTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(settings.timeLimit ?? null);
  
  const [player1, setPlayer1] = useState<PlayerState>({
    score: 0,
    hasAnswered: false,
    lastAnswer: null,
    showResult: null,
    resultMessage: '',
    answerTime: null,
  });
  
  const [player2, setPlayer2] = useState<PlayerState>({
    score: 0,
    hasAnswered: false,
    lastAnswer: null,
    showResult: null,
    resultMessage: '',
    answerTime: null,
  });

  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const transitionTimeout = useRef<number | null>(null);
  const timerInterval = useRef<number | null>(null);

  const currentRoute = routes[currentRouteIndex];
  // Use mobile (9:16) maps for better split-screen display
  const currentImageUrl = currentRoute 
    ? getImageUrlByMapName(currentRoute.mapName || '', currentRoute.candidateIndex, true)
    : '';

  // Timer countdown
  useEffect(() => {
    if (settings.timeLimit && !gameOver && isImageLoaded && !isTransitioning) {
      timerInterval.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) return prev;
          const newTime = prev - 0.1;
          if (newTime <= 0) {
            // Time's up - force both players to have "answered" (wrong if they haven't)
            if (!player1.hasAnswered) {
              setPlayer1(p => ({ ...p, hasAnswered: true, lastAnswer: null }));
            }
            if (!player2.hasAnswered) {
              setPlayer2(p => ({ ...p, hasAnswered: true, lastAnswer: null }));
            }
            return 0;
          }
          return newTime;
        });
      }, 100);
      
      return () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
      };
    }
  }, [settings.timeLimit, gameOver, isImageLoaded, isTransitioning, player1.hasAnswered, player2.hasAnswered]);

  // Reset timer on new route
  useEffect(() => {
    if (settings.timeLimit) {
      setTimeRemaining(settings.timeLimit);
    }
    setRouteStartTime(Date.now());
  }, [currentRouteIndex, settings.timeLimit]);

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

    // Preload next few images (mobile versions)
    for (let i = 1; i <= 3; i++) {
      const nextIndex = currentRouteIndex + i;
      if (nextIndex < routes.length) {
        const nextRoute = routes[nextIndex];
        const nextUrl = getImageUrlByMapName(nextRoute.mapName || '', nextRoute.candidateIndex, true);
        if (!preloadedImages.current.has(nextUrl)) {
          const img = new Image();
          img.src = nextUrl;
          preloadedImages.current.set(nextUrl, img);
        }
      }
    }

    return () => {
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routes, currentRoute, currentImageUrl]);

  // Handle player answer
  const handlePlayerAnswer = useCallback((player: 1 | 2, direction: 'left' | 'right') => {
    if (isTransitioning || gameOver) return;
    
    const setPlayer = player === 1 ? setPlayer1 : setPlayer2;
    const playerState = player === 1 ? player1 : player2;
    
    if (playerState.hasAnswered) return;
    
    const answerTime = Date.now() - routeStartTime;
    const isCorrect = direction === currentRoute?.shortestSide;
    
    setPlayer(prev => ({
      ...prev,
      hasAnswered: true,
      lastAnswer: direction,
      answerTime,
      score: isCorrect ? prev.score + 1 : prev.score,
    }));
  }, [isTransitioning, gameOver, player1, player2, currentRoute, routeStartTime]);

  // Process round results
  const processRoundResults = useCallback(() => {
    const p1Correct = player1.lastAnswer === currentRoute?.shortestSide;
    const p2Correct = player2.lastAnswer === currentRoute?.shortestSide;
    
    let p1Bonus = 0;
    let p2Bonus = 0;
    
    // Speed bonus in speed mode
    if (settings.gameMode === 'speed' && p1Correct && p2Correct) {
      if (player1.answerTime && player2.answerTime) {
        if (player1.answerTime < player2.answerTime) {
          p1Bonus = SPEED_BONUS;
        } else if (player2.answerTime < player1.answerTime) {
          p2Bonus = SPEED_BONUS;
        }
      }
    }
    
    setPlayer1(prev => ({
      ...prev,
      showResult: p1Correct ? 'win' : 'lose',
      resultMessage: p1Correct 
        ? (p1Bonus > 0 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player1.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p1Bonus,
    }));
    
    setPlayer2(prev => ({
      ...prev,
      showResult: p2Correct ? 'win' : 'lose',
      resultMessage: p2Correct 
        ? (p2Bonus > 0 ? 'Correct! +Speed Bonus!' : 'Correct!') 
        : (player2.lastAnswer === null ? 'Time Out!' : 'Wrong!'),
      score: prev.score + p2Bonus,
    }));
    
    setIsTransitioning(true);
    
    // Move to next route after delay
    transitionTimeout.current = window.setTimeout(() => {
      if (currentRouteIndex + 1 >= totalRoutes) {
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
    }, 1000);
  }, [player1, player2, currentRoute, currentRouteIndex, totalRoutes, settings.gameMode]);

  // Check if round should end
  useEffect(() => {
    if (isTransitioning) return;
    
    if (settings.gameMode === 'wait') {
      // Wait mode: both players must answer
      if (player1.hasAnswered && player2.hasAnswered && !player1.showResult) {
        processRoundResults();
      }
    } else {
      // Speed mode: move on immediately when both have answered OR after a short delay when one answers
      if (player1.hasAnswered && player2.hasAnswered && !player1.showResult) {
        processRoundResults();
      }
    }
  }, [player1.hasAnswered, player2.hasAnswered, player1.showResult, isTransitioning, settings.gameMode, processRoundResults]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      // Player 1: WASD
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handlePlayerAnswer(1, 'left');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlePlayerAnswer(1, 'right');
      }
      
      // Player 2: Arrows
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
  }, [handlePlayerAnswer, gameOver]);

  // Game Over Screen
  if (gameOver) {
    const winner = player1.score > player2.score ? 1 : player2.score > player1.score ? 2 : 0;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-fade-in text-center">
          <Trophy className={`h-20 w-20 mx-auto ${
            winner === 1 ? 'text-red-500' : winner === 2 ? 'text-blue-500' : 'text-yellow-500'
          }`} />
          
          <h2 className="text-3xl font-bold">
            {winner === 0 ? "It's a Tie!" : `Player ${winner} Wins!`}
          </h2>
          
          <div className="flex justify-center gap-8 text-2xl font-bold">
            <div className="text-red-500">
              P1: {player1.score.toFixed(1)}
            </div>
            <div className="text-muted-foreground">-</div>
            <div className="text-blue-500">
              P2: {player2.score.toFixed(1)}
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
    return <div className="flex justify-center items-center h-64">Loading routes...</div>;
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Score Bar */}
      <div className="p-2">
        <DuelScoreBar 
          player1Score={player1.score}
          player2Score={player2.score}
          totalRoutes={totalRoutes}
          currentRoute={currentRouteIndex}
          timeRemaining={timeRemaining}
          timeLimit={settings.timeLimit}
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
