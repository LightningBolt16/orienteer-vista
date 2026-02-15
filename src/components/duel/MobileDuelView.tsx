import React from 'react';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';
import SafeZoneImage from '../map/SafeZoneImage';

interface PlayerState {
  score: number;
  hasAnswered: boolean;
  showResult: 'win' | 'lose' | null;
  isTransitioning: boolean;
}

interface MobileDuelViewProps {
  currentRoute: RouteData;
  player1: PlayerState;
  player2: PlayerState;
  isImageLoaded: boolean;
  isTransitioning: boolean;
  gameTimeRemaining: number | null;
  isTimedMode: boolean;
  routesCompleted: number;
  totalRoutes: number;
  onPlayerAnswer: (player: 1 | 2, direction: 'left' | 'right') => void;
  onExit: () => void;
}

// Portrait mode: Player 1 at bottom (charging port), Player 2 at top (notch)
// Two-layer architecture: SafeZoneImage for map + static UI overlay for buttons
const MobileDuelView: React.FC<MobileDuelViewProps> = ({
  currentRoute,
  player1,
  player2,
  isImageLoaded,
  isTransitioning,
  gameTimeRemaining,
  isTimedMode,
  routesCompleted,
  totalRoutes,
  onPlayerAnswer,
  onExit,
}) => {
  const currentImageUrl = currentRoute 
    ? (currentRoute.imagePath || getImageUrlByMapName(currentRoute.mapName || '', currentRoute.candidateIndex, true))
    : '';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Layer 1: Transformed map image */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-200 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
        {isImageLoaded && currentImageUrl ? (
          <SafeZoneImage
            src={currentImageUrl}
            safeZone={currentRoute?.safeZone}
            isFullscreen={true}
            alt="Route"
          />
        ) : (
          <div className="w-full h-full bg-muted/10 animate-pulse" />
        )}
      </div>

      {/* Layer 2: Static UI overlay */}
      <div className="absolute inset-0 z-10">
        {/* Player 2 area - TOP half (rotated 180 for person at notch end) */}
        <div className="absolute top-0 left-0 right-0 h-1/2" style={{ transform: 'rotate(180deg)' }}>
          <div className="absolute inset-0 flex">
            {/* P2 Left button (blue - swapped for P2's perspective) */}
            <button
              onClick={() => onPlayerAnswer(2, 'right')}
              disabled={isTransitioning || player2.hasAnswered}
              className="w-1/2 h-full flex items-center justify-center active:bg-blue-500/40 transition-colors"
              style={{
                background: player2.hasAnswered 
                  ? 'rgba(59,130,246,0.1)'
                  : 'linear-gradient(180deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.15) 50%, transparent 100%)',
              }}
            >
              <span className="text-blue-400 text-4xl font-bold opacity-70">L</span>
            </button>
            
            {/* P2 Right button (red - swapped for P2's perspective) */}
            <button
              onClick={() => onPlayerAnswer(2, 'left')}
              disabled={isTransitioning || player2.hasAnswered}
              className="w-1/2 h-full flex items-center justify-center active:bg-red-500/40 transition-colors"
              style={{
                background: player2.hasAnswered 
                  ? 'rgba(239,68,68,0.1)'
                  : 'linear-gradient(180deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.15) 50%, transparent 100%)',
              }}
            >
              <span className="text-red-400 text-4xl font-bold opacity-70">R</span>
            </button>
          </div>

          {/* P2 Score */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-purple-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
              <span className="text-white font-bold text-lg">P2: {player2.score.toFixed(1)}</span>
            </div>
          </div>

          {/* P2 Result indicator */}
          {player2.showResult && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <span className={`text-7xl font-bold ${player2.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
                {player2.showResult === 'win' ? '✓' : '✗'}
              </span>
            </div>
          )}
          
          {player2.hasAnswered && !player2.showResult && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground text-sm">Waiting...</span>
              </div>
            </div>
          )}
        </div>

        {/* Center HUD - Route counter and Exit */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-3">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg">
            <div className="text-foreground font-mono font-bold text-sm text-center">
              {isTimedMode && gameTimeRemaining !== null ? (
                <span className={gameTimeRemaining < 10 ? 'text-destructive animate-pulse' : ''}>
                  {Math.floor(gameTimeRemaining / 60)}:{String(Math.floor(gameTimeRemaining % 60)).padStart(2, '0')}
                </span>
              ) : (
                <span>{routesCompleted + 1}/{totalRoutes}</span>
              )}
            </div>
          </div>
          <button 
            onClick={onExit}
            className="bg-background/80 backdrop-blur-sm text-foreground px-3 py-2 rounded-lg text-xs border border-border shadow-sm"
          >
            Exit
          </button>
        </div>

        {/* Player 1 area - BOTTOM half */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2">
          <div className="absolute inset-0 flex">
            {/* P1 Left button (red) */}
            <button
              onClick={() => onPlayerAnswer(1, 'left')}
              disabled={isTransitioning || player1.hasAnswered}
              className="w-1/2 h-full flex items-center justify-center active:bg-red-500/40 transition-colors"
              style={{
                background: player1.hasAnswered 
                  ? 'rgba(239,68,68,0.1)'
                  : 'linear-gradient(0deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.15) 50%, transparent 100%)',
              }}
            >
              <span className="text-red-400 text-4xl font-bold opacity-70">L</span>
            </button>
            
            {/* P1 Right button (blue) */}
            <button
              onClick={() => onPlayerAnswer(1, 'right')}
              disabled={isTransitioning || player1.hasAnswered}
              className="w-1/2 h-full flex items-center justify-center active:bg-blue-500/40 transition-colors"
              style={{
                background: player1.hasAnswered 
                  ? 'rgba(59,130,246,0.1)'
                  : 'linear-gradient(0deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.15) 50%, transparent 100%)',
              }}
            >
              <span className="text-blue-400 text-4xl font-bold opacity-70">R</span>
            </button>
          </div>

          {/* P1 Score */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-green-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
              <span className="text-white font-bold text-lg">P1: {player1.score.toFixed(1)}</span>
            </div>
          </div>

          {/* P1 Result indicator */}
          {player1.showResult && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <span className={`text-7xl font-bold ${player1.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
                {player1.showResult === 'win' ? '✓' : '✗'}
              </span>
            </div>
          )}
          
          {player1.hasAnswered && !player1.showResult && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground text-sm">Waiting...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileDuelView;
