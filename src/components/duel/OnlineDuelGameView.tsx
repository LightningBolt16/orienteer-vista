import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw, Home } from 'lucide-react';
import { RouteData } from '@/utils/routeDataUtils';
import { Button } from '../ui/button';
import { OnlineDuelRoom } from '@/hooks/useOnlineDuel';
import { AspectRatio } from '../ui/aspect-ratio';

interface OnlineDuelGameViewProps {
  routes: RouteData[];
  room: OnlineDuelRoom;
  isHost: boolean;
  isMobile: boolean;
  onAnswer: (routeIndex: number, answer: 'left' | 'right', answerTimeMs: number, isCorrect: boolean) => Promise<void>;
  onExit: () => void;
  onFinishGame: () => Promise<void>;
}

const PRELOAD_AHEAD_COUNT = 5;

const OnlineDuelGameView: React.FC<OnlineDuelGameViewProps> = ({
  routes,
  room,
  isHost,
  isMobile,
  onAnswer,
  onExit,
  onFinishGame,
}) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const resultTimeout = useRef<number | null>(null);
  const transitionTimeout = useRef<number | null>(null);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  const currentRoute = routes[currentRouteIndex % routes.length];
  const myScore = isHost ? room.host_score : room.guest_score;
  const opponentScore = isHost ? room.guest_score : room.host_score;
  const opponentName = isHost ? (room.guest_name || 'Opponent') : (room.host_name || 'Host');

  // Get image URL for a route
  const getImageUrl = (route: RouteData): string => {
    return route.imagePath || '';
  };

  // Check game over from server status
  useEffect(() => {
    if (room.status === 'finished') {
      setGameOver(true);
    }
  }, [room.status]);

  // Check if all routes completed locally
  useEffect(() => {
    if (currentRouteIndex >= routes.length && !gameOver) {
      // Mark game as finished
      onFinishGame();
      setGameOver(true);
    }
  }, [currentRouteIndex, routes.length, gameOver, onFinishGame]);

  // Preload current and upcoming images
  useEffect(() => {
    if (!currentRoute) return;

    const currentImageUrl = getImageUrl(currentRoute);

    const existingImg = preloadedImages.current.get(currentImageUrl);
    if (existingImg?.complete) {
      setIsImageLoaded(true);
    } else {
      setIsImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setIsImageLoaded(true);
        preloadedImages.current.set(currentImageUrl, img);
      };
      img.src = currentImageUrl;
    }

    // Preload upcoming images
    for (let i = 1; i < PRELOAD_AHEAD_COUNT; i++) {
      const index = (currentRouteIndex + i) % routes.length;
      const route = routes[index];
      const imageUrl = getImageUrl(route);
      if (!preloadedImages.current.has(imageUrl)) {
        const img = new Image();
        img.src = imageUrl;
        preloadedImages.current.set(imageUrl, img);
      }
    }

    return () => {
      if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routes, currentRoute]);

  // Start timer when image loads
  useEffect(() => {
    if (isImageLoaded && !isTransitioning) {
      setStartTime(Date.now());
    }
  }, [isImageLoaded, currentRouteIndex, isTransitioning]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning || routes.length === 0 || startTime === null) return;

    const isCorrect = direction === currentRoute.shortestSide;
    const responseTime = Date.now() - startTime;

    // Submit answer to server
    onAnswer(currentRouteIndex, direction, responseTime, isCorrect);

    // Show result
    if (isCorrect) {
      if (responseTime < 1000) {
        setResultMessage('Excellent!');
      } else if (responseTime < 2000) {
        setResultMessage('Good!');
      } else {
        setResultMessage('Correct!');
      }
    } else {
      setResultMessage('Wrong!');
    }

    setShowResult(isCorrect ? 'win' : 'lose');
    setIsTransitioning(true);

    if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);

    resultTimeout.current = window.setTimeout(() => {
      setShowResult(null);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentRouteIndex((prev) => prev + 1);
        setIsTransitioning(false);
        setIsImageLoaded(false);
      }, 200);
    }, 400);
  };

  // Keyboard support
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirectionSelect('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirectionSelect('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isTransitioning, startTime, currentRouteIndex]);

  // Game over screen
  if (gameOver) {
    const iWon = myScore > opponentScore;
    const isTie = myScore === opponentScore;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 text-center">
          <Trophy className={`h-20 w-20 mx-auto ${isTie ? 'text-yellow-500' : iWon ? 'text-green-500' : 'text-muted-foreground'}`} />

          <h2 className="text-3xl font-bold text-foreground">
            {isTie ? "It's a Tie!" : iWon ? 'You Win!' : `${opponentName} Wins!`}
          </h2>

          <div className="flex justify-center gap-8 text-2xl font-bold">
            <div className="text-primary">
              You: {myScore % 1 === 0 ? myScore : myScore.toFixed(1)}
            </div>
            <div className="text-muted-foreground">-</div>
            <div className="text-muted-foreground">
              {opponentName}: {opponentScore % 1 === 0 ? opponentScore : opponentScore.toFixed(1)}
            </div>
          </div>

          <Button onClick={onExit} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>
    );
  }

  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64 text-foreground">Loading routes...</div>;
  }

  const currentImageUrl = getImageUrl(currentRoute);
  const RED_COLOR = '#FF5733';
  const BLUE_COLOR = '#3357FF';

  // Mobile View
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        {/* Score Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              You
            </div>
            <span className="font-bold text-lg">{myScore % 1 === 0 ? myScore : myScore.toFixed(1)}</span>
          </div>
          <div className="text-sm text-muted-foreground">Route {currentRouteIndex + 1}</div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{opponentScore % 1 === 0 ? opponentScore : opponentScore.toFixed(1)}</span>
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
              {opponentName.charAt(0)}
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Side glow effects */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 z-10"
            style={{
              background: `linear-gradient(to right, ${RED_COLOR}99, transparent)`,
              boxShadow: `0 0 15px 0 ${RED_COLOR}88`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-3 z-10"
            style={{
              background: `linear-gradient(to left, ${BLUE_COLOR}99, transparent)`,
              boxShadow: `0 0 15px 0 ${BLUE_COLOR}88`,
            }}
          />

          <div className="h-full flex items-center justify-center">
            {isImageLoaded && !showResult && (
              <img
                src={currentImageUrl}
                alt="Route"
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
              />
            )}

            {showResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-background/80">
                {showResult === 'win' ? (
                  <>
                    <CheckCircle className="text-green-500 w-20 h-20 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                      {resultMessage}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-500 w-20 h-20 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                      {resultMessage}
                    </div>
                  </>
                )}
              </div>
            )}

            {isImageLoaded && !showResult && (
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleDirectionSelect('left')} />
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleDirectionSelect('right')} />
              </div>
            )}
          </div>
        </div>

        {/* Exit Button */}
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="sm" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>
    );
  }

  // Desktop View
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Score Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            You
          </div>
          <span className="font-bold text-2xl">{myScore % 1 === 0 ? myScore : myScore.toFixed(1)}</span>
        </div>
        <div className="text-lg text-muted-foreground">Route {currentRouteIndex + 1}</div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-2xl">{opponentScore % 1 === 0 ? opponentScore : opponentScore.toFixed(1)}</span>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
            {opponentName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div className="glass-card h-full">
          <div className="relative h-full overflow-hidden flex items-center justify-center">
            {isImageLoaded && !showResult && (
              <img
                src={currentImageUrl}
                alt="Route"
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
              />
            )}

            {showResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-background/80">
                {showResult === 'win' ? (
                  <>
                    <CheckCircle className="text-green-500 w-32 h-32 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                      {resultMessage}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-500 w-32 h-32 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                      {resultMessage}
                    </div>
                  </>
                )}
              </div>
            )}

            {isImageLoaded && !showResult && (
              <div className="absolute inset-x-0 bottom-0 p-6 flex justify-between">
                <button
                  onClick={() => handleDirectionSelect('left')}
                  style={{ backgroundColor: `${RED_COLOR}CC` }}
                  className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                  disabled={isTransitioning}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>

                <button
                  onClick={() => handleDirectionSelect('right')}
                  style={{ backgroundColor: `${BLUE_COLOR}CC` }}
                  className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                  disabled={isTransitioning}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
            )}
          </div>
        </div>
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

export default OnlineDuelGameView;