import React from 'react';
import { Timer } from 'lucide-react';

interface DuelScoreBarProps {
  player1Score: number;
  player2Score: number;
  player1PendingScore: number;
  player2PendingScore: number;
  totalRoutes: number;
  currentRoute: number;
  gameTimeRemaining?: number | null;
  isTimedMode?: boolean;
  routesCompleted?: number;
  roundTimeRemaining?: number | null;
}

const DuelScoreBar: React.FC<DuelScoreBarProps> = ({
  player1Score,
  player2Score,
  player1PendingScore,
  player2PendingScore,
  totalRoutes,
  currentRoute,
  gameTimeRemaining,
  isTimedMode,
  routesCompleted = 0,
  roundTimeRemaining,
}) => {
  // Show pending scores (before both players answered) or confirmed scores
  const displayP1 = player1PendingScore;
  const displayP2 = player2PendingScore;
  
  const maxScore = Math.max(totalRoutes, 10, displayP1 + 1, displayP2 + 1);
  const p1Width = (displayP1 / maxScore) * 100;
  const p2Width = (displayP2 / maxScore) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg p-3 space-y-2">
      {/* Route Progress & Timer */}
      <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
        {isTimedMode ? (
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 font-bold text-lg ${gameTimeRemaining !== null && gameTimeRemaining !== undefined && gameTimeRemaining <= 10 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
              <Timer className="h-5 w-5" />
              {gameTimeRemaining !== null && gameTimeRemaining !== undefined ? formatTime(gameTimeRemaining) : '0:00'}
            </span>
            <span className="text-muted-foreground">
              {routesCompleted} routes completed
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span>Route {Math.min(currentRoute + 1, totalRoutes)} of {totalRoutes}</span>
            {roundTimeRemaining !== null && roundTimeRemaining !== undefined && (
              <span className={`flex items-center gap-1 font-bold ${roundTimeRemaining <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                <Timer className="h-4 w-4" />
                {roundTimeRemaining}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-4">
        {/* Player 1 */}
        <div className="flex-1 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            P1
          </div>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, p1Width)}%` }}
            />
          </div>
          <span className="font-bold text-lg min-w-[2.5rem] text-right text-red-500">
            {displayP1 % 1 === 0 ? displayP1 : displayP1.toFixed(1)}
          </span>
        </div>

        {/* VS Divider */}
        <div className="text-muted-foreground font-bold text-sm">VS</div>

        {/* Player 2 */}
        <div className="flex-1 flex items-center gap-2">
          <span className="font-bold text-lg min-w-[2.5rem] text-left text-blue-500">
            {displayP2 % 1 === 0 ? displayP2 : displayP2.toFixed(1)}
          </span>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-l from-blue-500 to-blue-400 transition-all duration-500 rounded-full ml-auto"
              style={{ width: `${Math.max(0, p2Width)}%` }}
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            P2
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuelScoreBar;
