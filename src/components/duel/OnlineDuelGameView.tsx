import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw, Home } from 'lucide-react';
import { RouteData } from '@/utils/routeDataUtils';
import { Button } from '../ui/button';
import { OnlineDuelRoom, PlayerSlot } from '@/hooks/useOnlineDuel';
import SafeZoneImage from '../map/SafeZoneImage';

interface PlayerScore {
  slot: PlayerSlot;
  name: string;
  score: number;
  color: string;
}

interface OnlineDuelGameViewProps {
  routes: RouteData[];
  room: OnlineDuelRoom;
  playerSlot: PlayerSlot;
  isMobile: boolean;
  onAnswer: (routeIndex: number, answer: 'left' | 'right', answerTimeMs: number, isCorrect: boolean) => Promise<void>;
  onExit: () => void;
  onFinishGame: () => Promise<void>;
  onRematch?: () => void;
}

const PRELOAD_AHEAD_COUNT = 5;

const PLAYER_COLORS = {
  host: '#ef4444',
  guest: '#3b82f6',
  player_3: '#22c55e',
  player_4: '#a855f7',
};

const RED_COLOR = '#FF5733';
const BLUE_COLOR = '#3357FF';

const OnlineDuelGameView: React.FC<OnlineDuelGameViewProps> = ({
  routes,
  room,
  playerSlot,
  isMobile,
  onAnswer,
  onExit,
  onFinishGame,
  onRematch,
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

  const getPlayerScores = (): PlayerScore[] => {
    const scores: PlayerScore[] = [
      { slot: 'host', name: room.host_name || 'Host', score: room.host_score, color: PLAYER_COLORS.host },
    ];
    if (room.guest_id) {
      scores.push({ slot: 'guest', name: room.guest_name || 'Player 2', score: room.guest_score, color: PLAYER_COLORS.guest });
    }
    if (room.player_3_id) {
      scores.push({ slot: 'player_3', name: room.player_3_name || 'Player 3', score: room.player_3_score, color: PLAYER_COLORS.player_3 });
    }
    if (room.player_4_id) {
      scores.push({ slot: 'player_4', name: room.player_4_name || 'Player 4', score: room.player_4_score, color: PLAYER_COLORS.player_4 });
    }
    return scores;
  };

  const getImageUrl = (route: RouteData): string => route.imagePath || '';

  // Check game over from server
  useEffect(() => {
    if (room.status === 'finished') setGameOver(true);
  }, [room.status]);

  // Check if all routes completed locally
  useEffect(() => {
    if (currentRouteIndex >= routes.length && !gameOver) {
      onFinishGame();
      setGameOver(true);
    }
  }, [currentRouteIndex, routes.length, gameOver, onFinishGame]);

  // Preload images
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
    if (isImageLoaded && !isTransitioning) setStartTime(Date.now());
  }, [isImageLoaded, currentRouteIndex, isTransitioning]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning || routes.length === 0 || startTime === null) return;
    const isCorrect = direction === currentRoute.shortestSide;
    const responseTime = Date.now() - startTime;
    onAnswer(currentRouteIndex, direction, responseTime, isCorrect);

    if (isCorrect) {
      setResultMessage(responseTime < 1000 ? 'Excellent!' : responseTime < 2000 ? 'Good!' : 'Correct!');
    } else {
      setResultMessage('Wrong!');
    }

    setShowResult(isCorrect ? 'win' : 'lose');
    setIsTransitioning(true);

    if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);

    resultTimeout.current = window.setTimeout(() => {
      setShowResult(null);
      setIsImageLoaded(false);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentRouteIndex((prev) => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }, 400);
  };

  // Keyboard support
  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleDirectionSelect('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleDirectionSelect('right'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isTransitioning, startTime, currentRouteIndex]);

  // Game over screen
  if (gameOver) {
    const scores = getPlayerScores().sort((a, b) => b.score - a.score);
    const myRank = scores.findIndex(s => s.slot === playerSlot) + 1;
    const iWon = myRank === 1;
    const isTie = scores.length > 1 && scores[0].score === scores[1].score;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 text-center">
          <Trophy className={`h-20 w-20 mx-auto ${isTie ? 'text-yellow-500' : iWon ? 'text-green-500' : 'text-muted-foreground'}`} />
          <h2 className="text-3xl font-bold text-foreground">
            {isTie ? "It's a Tie!" : iWon ? 'You Win!' : `${scores[0].name} Wins!`}
          </h2>
          <div className="space-y-2">
            {scores.map((player, index) => {
              const isMe = player.slot === playerSlot;
              return (
                <div key={player.slot} className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-primary/10 border border-primary' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6">{index + 1}.</span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: player.color }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{isMe ? 'You' : player.name}</span>
                  </div>
                  <span className="font-bold text-lg">
                    {player.score % 1 === 0 ? player.score : player.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={onExit} className="flex-1">
              <Home className="h-4 w-4 mr-2" />Exit
            </Button>
            {playerSlot === 'host' && onRematch && (
              <Button onClick={onRematch} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />Rematch
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64 text-foreground">Loading routes...</div>;
  }

  const currentImageUrl = getImageUrl(currentRoute);
  const playerScores = getPlayerScores();
  const is1x1 = currentRoute.sourceAspect === '1:1';

  // Score Bar
  const ScoreBar = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center justify-between ${compact ? 'px-2 py-1' : 'px-4 py-2'} bg-muted/50`}>
      <div className="flex items-center gap-2 flex-wrap">
        {playerScores.map((player) => {
          const isMe = player.slot === playerSlot;
          return (
            <div key={player.slot} className={`flex items-center gap-1 ${compact ? 'text-sm' : ''}`}>
              <div
                className={`${compact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'} rounded-full flex items-center justify-center text-white font-bold ${isMe ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className={`font-bold ${isMe ? 'text-primary' : ''}`}>
                {player.score % 1 === 0 ? player.score : player.score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <div className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
        Route {currentRouteIndex + 1}
      </div>
    </div>
  );

  // Result overlay (always viewport-centered, no transform)
  const renderResultOverlay = (iconSize = 'w-20 h-20') => {
    if (!showResult) return null;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-background/80 z-20">
        {showResult === 'win' ? (
          <>
            <CheckCircle className={`text-green-500 ${iconSize} animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]`} />
            <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
              {resultMessage}
            </div>
          </>
        ) : (
          <>
            <XCircle className={`text-red-500 ${iconSize} animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]`} />
            <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
              {resultMessage}
            </div>
          </>
        )}
      </div>
    );
  };

  // === MOBILE VIEW ===
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <ScoreBar compact />

        {/* Game Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Layer 1: Image with SafeZone zoom */}
          {is1x1 ? (
            <SafeZoneImage
              src={currentImageUrl}
              isFullscreen
              safeZone={currentRoute.safeZone}
              alt="Route"
              onLoad={() => setIsImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={currentImageUrl}
                alt="Route"
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
                onLoad={() => setIsImageLoaded(true)}
              />
            </div>
          )}

          {/* Layer 2: Static UI overlay (no transform) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Edge glows */}
            <div
              className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to right, ${RED_COLOR}40, transparent)`,
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to left, ${BLUE_COLOR}40, transparent)`,
              }}
            />

            {/* Result overlay */}
            {renderResultOverlay('w-10 h-10')}

            {/* Touch zones */}
            {isImageLoaded && !showResult && (
              <div className="absolute inset-0 flex pointer-events-auto">
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleDirectionSelect('left')} />
                <div className="w-1/2 h-full cursor-pointer" onClick={() => handleDirectionSelect('right')} />
              </div>
            )}
          </div>
        </div>

        {/* Exit Button */}
        <div className="absolute top-2 right-2 z-30">
          <Button variant="ghost" size="sm" onClick={onExit} className="text-white">
            Exit
          </Button>
        </div>
      </div>
    );
  }

  // === DESKTOP VIEW ===
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Score Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-4">
          {playerScores.map((player) => {
            const isMe = player.slot === playerSlot;
            return (
              <div key={player.slot} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${isMe ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: player.color }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs ${isMe ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {isMe ? 'You' : player.name}
                  </span>
                  <span className="font-bold text-lg">
                    {player.score % 1 === 0 ? player.score : player.score.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-lg text-muted-foreground">Route {currentRouteIndex + 1}</div>
      </div>

      {/* Game Area - Two-layer architecture */}
      <div className="flex-1 relative overflow-hidden">
        {/* Layer 1: Image with SafeZone zoom */}
        {is1x1 ? (
          <SafeZoneImage
            src={currentImageUrl}
            isFullscreen
            safeZone={currentRoute.safeZone}
            alt="Route"
            onLoad={() => setIsImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={currentImageUrl}
              alt="Route"
              className={`max-w-full max-h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
              onLoad={() => setIsImageLoaded(true)}
            />
          </div>
        )}

        {/* Layer 2: Static UI overlay (no transform) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Result overlay */}
          {renderResultOverlay('w-32 h-32')}

          {/* Arrow buttons at viewport edges */}
          {isImageLoaded && !showResult && (
            <div className="pointer-events-auto">
              <button
                onClick={() => handleDirectionSelect('left')}
                style={{ backgroundColor: `${RED_COLOR}CC` }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10"
                disabled={isTransitioning}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>

              <button
                onClick={() => handleDirectionSelect('right')}
                style={{ backgroundColor: `${BLUE_COLOR}CC` }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10"
                disabled={isTransitioning}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exit Button */}
      <div className="absolute top-2 right-2 z-30">
        <Button variant="ghost" size="sm" onClick={onExit} className="text-white">
          Exit
        </Button>
      </div>
    </div>
  );
};

export default OnlineDuelGameView;
