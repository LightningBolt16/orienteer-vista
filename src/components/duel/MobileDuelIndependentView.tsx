import React from 'react';
import { RouteData, getImageUrlByMapName } from '../../utils/routeDataUtils';

interface PlayerState {
  score: number;
  currentRouteIndex: number;
  isTransitioning: boolean;
  showResult: 'win' | 'lose' | null;
}

interface MobileDuelIndependentViewProps {
  routes: RouteData[];
  player1: PlayerState;
  player2: PlayerState;
  gameTimeRemaining: number | null;
  totalRoutes: number;
  onPlayerAnswer: (player: 1 | 2, direction: 'left' | 'right') => void;
  onExit: () => void;
}

// Independent mode: Each player has their own route progression
// Portrait mode with split screen (top/bottom)
const MobileDuelIndependentView: React.FC<MobileDuelIndependentViewProps> = ({
  routes,
  player1,
  player2,
  gameTimeRemaining,
  totalRoutes,
  onPlayerAnswer,
  onExit,
}) => {
  const player1Route = routes[player1.currentRouteIndex % routes.length];
  const player2Route = routes[player2.currentRouteIndex % routes.length];
  
  const player1ImageUrl = player1Route 
    ? getImageUrlByMapName(player1Route.mapName || '', player1Route.candidateIndex, true)
    : '';
  const player2ImageUrl = player2Route 
    ? getImageUrlByMapName(player2Route.mapName || '', player2Route.candidateIndex, true)
    : '';

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* Player 2 area - TOP half (rotated 180 for person at notch end) */}
      <div className="relative h-1/2 border-b border-border" style={{ transform: 'rotate(180deg)' }}>
        {/* Route image for P2 */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <img
            src={player2ImageUrl}
            alt="Route P2"
            className={`w-full h-full object-contain transition-opacity duration-150 ${
              player2.isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}
          />
        </div>

        {/* Touch zone covering entire half */}
        <button
          onClick={() => onPlayerAnswer(2, 'left')}
          disabled={player2.isTransitioning}
          className="absolute inset-0 w-full h-full z-10"
          style={{
            background: 'linear-gradient(180deg, rgba(59,130,246,0.2) 0%, transparent 50%)',
          }}
        />

        {/* P2 Score - at their bottom (appears at top of screen after rotation) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-blue-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
            <span className="text-white font-bold text-lg">P2: {player2.score.toFixed(1)}</span>
          </div>
        </div>

        {/* P2 Result */}
        {player2.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-7xl font-bold ${player2.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player2.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
      </div>

      {/* Center HUD - Timer and Exit */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-3">
        {gameTimeRemaining !== null && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg">
            <div className="text-foreground font-mono font-bold text-sm text-center">
              <span className={gameTimeRemaining < 10 ? 'text-destructive animate-pulse' : ''}>
                {Math.floor(gameTimeRemaining / 60)}:{String(Math.floor(gameTimeRemaining % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
        <button 
          onClick={onExit}
          className="bg-background/80 backdrop-blur-sm text-foreground px-3 py-2 rounded-lg text-xs border border-border shadow-sm"
        >
          Exit
        </button>
      </div>

      {/* Player 1 area - BOTTOM half */}
      <div className="relative h-1/2 border-t border-border">
        {/* Route image for P1 */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <img
            src={player1ImageUrl}
            alt="Route P1"
            className={`w-full h-full object-contain transition-opacity duration-150 ${
              player1.isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}
          />
        </div>

        {/* Touch zone covering entire half */}
        <button
          onClick={() => onPlayerAnswer(1, 'left')}
          disabled={player1.isTransitioning}
          className="absolute inset-0 w-full h-full z-10"
          style={{
            background: 'linear-gradient(0deg, rgba(239,68,68,0.2) 0%, transparent 50%)',
          }}
        />

        {/* P1 Score - at bottom */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-red-500/90 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg">
            <span className="text-white font-bold text-lg">P1: {player1.score.toFixed(1)}</span>
          </div>
        </div>

        {/* P1 Result */}
        {player1.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-7xl font-bold ${player1.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player1.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDuelIndependentView;
