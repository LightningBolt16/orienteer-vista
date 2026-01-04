import React from 'react';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';

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
// Full quadrant overlays with red/blue tints that cover the route image
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
    ? getImageUrlByMapName(currentRoute.mapName || '', currentRoute.candidateIndex, true)
    : '';

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* Full screen route image as background */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {isImageLoaded ? (
          <img
            src={currentImageUrl}
            alt="Route"
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-muted/10 animate-pulse" />
        )}
      </div>

      {/* Player 2 area - TOP half (for person with notch at their end) */}
      {/* Rotated 180 degrees so they can read/interact normally */}
      <div className="relative h-1/2 z-10" style={{ transform: 'rotate(180deg)' }}>
        {/* Touch zone covering entire half */}
        <button
          onClick={() => onPlayerAnswer(2, 'left')}
          disabled={isTransitioning || player2.hasAnswered}
          className="absolute inset-0 w-full h-full"
          style={{
            background: player2.hasAnswered 
              ? 'linear-gradient(180deg, rgba(59,130,246,0.1) 0%, transparent 50%)'
              : 'linear-gradient(180deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.1) 30%, transparent 60%)',
          }}
        />

        {/* Player 2 score - at their bottom (appears at top of screen after rotation) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-blue-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
            <span className="text-white font-bold text-lg">P2: {player2.score.toFixed(1)}</span>
          </div>
        </div>

        {/* Player 2 result indicator */}
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

      {/* Player 1 area - BOTTOM half (for person with charging port at their end) */}
      <div className="relative h-1/2 z-10">
        {/* Touch zone covering entire half */}
        <button
          onClick={() => onPlayerAnswer(1, 'left')}
          disabled={isTransitioning || player1.hasAnswered}
          className="absolute inset-0 w-full h-full"
          style={{
            background: player1.hasAnswered 
              ? 'linear-gradient(0deg, rgba(239,68,68,0.1) 0%, transparent 50%)'
              : 'linear-gradient(0deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.1) 30%, transparent 60%)',
          }}
        />

        {/* Player 1 score - at bottom */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-red-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
            <span className="text-white font-bold text-lg">P1: {player1.score.toFixed(1)}</span>
          </div>
        </div>

        {/* Player 1 result indicator */}
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
  );
};

export default MobileDuelView;
