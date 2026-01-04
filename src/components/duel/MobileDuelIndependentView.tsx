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

        {/* Touch zones for P2 */}
        <div className="absolute inset-0 flex z-10">
          <button
            onClick={() => onPlayerAnswer(2, 'left')}
            disabled={player2.isTransitioning}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, rgba(239,68,68,0.3) 0%, transparent 60%)',
              borderRight: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  player2.isTransitioning ? 'opacity-30' : 'opacity-90'
                }`}
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'rgb(239,68,68)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'rgb(239,68,68)' }}>L</span>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onPlayerAnswer(2, 'right')}
            disabled={player2.isTransitioning}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, rgba(59,130,246,0.3) 0%, transparent 60%)',
              borderLeft: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  player2.isTransitioning ? 'opacity-30' : 'opacity-90'
                }`}
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'rgb(59,130,246)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'rgb(59,130,246)' }}>R</span>
              </div>
            </div>
          </button>
        </div>

        {/* P2 Score - use top-2 which appears at top of P2's view after 180° rotation */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border">
            <span className="text-primary font-bold text-xs">P2: {player2.score.toFixed(1)}</span>
          </div>
        </div>

        {/* P2 Result */}
        {player2.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-5xl font-bold ${player2.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player2.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
      </div>

      {/* Center HUD */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-border shadow-lg">
          <div className="text-foreground font-mono font-bold text-lg text-center">
            {gameTimeRemaining !== null ? (
              <span className={gameTimeRemaining < 10 ? 'text-destructive animate-pulse' : ''}>
                {Math.floor(gameTimeRemaining / 60)}:{String(Math.floor(gameTimeRemaining % 60)).padStart(2, '0')}
              </span>
            ) : (
              <span className="text-primary">Speed Race</span>
            )}
          </div>
        </div>
      </div>

      {/* Exit button */}
      <button 
        onClick={onExit}
        className="absolute top-1/2 right-2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-sm text-foreground px-3 py-2 rounded-full text-xs border border-border"
      >
        Exit
      </button>

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

        {/* Touch zones for P1 */}
        <div className="absolute inset-0 flex z-10">
          <button
            onClick={() => onPlayerAnswer(1, 'left')}
            disabled={player1.isTransitioning}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(0deg, rgba(239,68,68,0.3) 0%, transparent 60%)',
              borderRight: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  player1.isTransitioning ? 'opacity-30' : 'opacity-90'
                }`}
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'rgb(239,68,68)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'rgb(239,68,68)' }}>L</span>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onPlayerAnswer(1, 'right')}
            disabled={player1.isTransitioning}
            className="flex-1 h-full relative transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(0deg, rgba(59,130,246,0.3) 0%, transparent 60%)',
              borderLeft: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  player1.isTransitioning ? 'opacity-30' : 'opacity-90'
                }`}
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'rgb(59,130,246)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'rgb(59,130,246)' }}>R</span>
              </div>
            </div>
          </button>
        </div>

        {/* P1 Score */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border">
            <span className="text-primary font-bold text-xs">P1: {player1.score.toFixed(1)}</span>
          </div>
        </div>

        {/* P1 Result */}
        {player1.showResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <span className={`text-5xl font-bold ${player1.showResult === 'win' ? 'text-green-500' : 'text-destructive'}`}>
              {player1.showResult === 'win' ? '✓' : '✗'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDuelIndependentView;
