import React from 'react';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';
import ScoringInfoDialog from './ScoringInfoDialog';

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
  gameMode: 'speed' | 'wait';
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
  gameMode,
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
        <div className="absolute inset-0 flex">
          {/* Player 2 LEFT zone (their left, appears on right when rotated) */}
          <button
            onClick={() => onPlayerAnswer(2, 'left')}
            disabled={isTransitioning || player2.hasAnswered}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: player2.hasAnswered 
                ? 'linear-gradient(180deg, rgba(239,68,68,0.15) 0%, transparent 60%)'
                : 'linear-gradient(180deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.15) 40%, transparent 70%)',
            }}
          />
          
          {/* Player 2 RIGHT zone */}
          <button
            onClick={() => onPlayerAnswer(2, 'right')}
            disabled={isTransitioning || player2.hasAnswered}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: player2.hasAnswered 
                ? 'linear-gradient(180deg, rgba(59,130,246,0.15) 0%, transparent 60%)'
                : 'linear-gradient(180deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Player 2 score - use bottom-3 which appears at top after 180° rotation */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-4 py-1.5 border border-border shadow-sm">
            <span className="text-primary font-bold text-sm">P2: {player2.score.toFixed(1)}</span>
          </div>
        </div>

        {/* Player 2 result indicator */}
        {player2.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-6xl font-bold ${player2.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player2.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {player2.hasAnswered && !player2.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-muted-foreground text-sm">Waiting...</span>
            </div>
          </div>
        )}
      </div>

      {/* Route counter - left side */}
      <div className="absolute top-1/2 left-2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg">
          <div className="text-foreground font-mono font-bold text-lg text-center">
            {isTimedMode && gameTimeRemaining !== null ? (
              <span className={gameTimeRemaining < 10 ? 'text-destructive animate-pulse' : ''}>
                {Math.floor(gameTimeRemaining / 60)}:{String(Math.floor(gameTimeRemaining % 60)).padStart(2, '0')}
              </span>
            ) : (
              <span className="text-primary">{routesCompleted + 1}/{totalRoutes}</span>
            )}
          </div>
        </div>
      </div>

      {/* Exit button - right side */}
      <button 
        onClick={onExit}
        className="absolute top-1/2 right-2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-sm text-foreground px-3 py-2 rounded-full text-xs border border-border shadow-sm"
      >
        Exit
      </button>

      {/* Scoring info button - left side below route counter */}
      <div className="absolute top-1/2 left-14 -translate-y-1/2 z-40">
        <ScoringInfoDialog 
          gameMode={gameMode} 
          gameType={isTimedMode ? 'timed' : 'routes'} 
          isOnline={false} 
        />
      </div>

      {/* Player 1 area - BOTTOM half (for person with charging port at their end) */}
      <div className="relative h-1/2 z-10">
        <div className="absolute inset-0 flex">
          {/* Player 1 LEFT zone */}
          <button
            onClick={() => onPlayerAnswer(1, 'left')}
            disabled={isTransitioning || player1.hasAnswered}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: player1.hasAnswered 
                ? 'linear-gradient(0deg, rgba(239,68,68,0.15) 0%, transparent 60%)'
                : 'linear-gradient(0deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.15) 40%, transparent 70%)',
            }}
          />
          
          {/* Player 1 RIGHT zone */}
          <button
            onClick={() => onPlayerAnswer(1, 'right')}
            disabled={isTransitioning || player1.hasAnswered}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: player1.hasAnswered 
                ? 'linear-gradient(0deg, rgba(59,130,246,0.15) 0%, transparent 60%)'
                : 'linear-gradient(0deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Player 1 score - at bottom of their view */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-4 py-1.5 border border-border shadow-sm">
            <span className="text-primary font-bold text-sm">P1: {player1.score.toFixed(1)}</span>
          </div>
        </div>

        {/* Player 1 result indicator */}
        {player1.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-6xl font-bold ${player1.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player1.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {player1.hasAnswered && !player1.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-muted-foreground text-sm">Waiting...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDuelView;
