import React from 'react';

interface DuelScoreBarProps {
  player1Score: number;
  player2Score: number;
  totalRoutes: number;
  currentRoute: number;
}

const DuelScoreBar: React.FC<DuelScoreBarProps> = ({
  player1Score,
  player2Score,
  totalRoutes,
  currentRoute,
}) => {
  const maxScore = Math.max(player1Score, player2Score, 1);
  const p1Width = (player1Score / totalRoutes) * 100;
  const p2Width = (player2Score / totalRoutes) * 100;

  return (
    <div className="w-full bg-card border border-border rounded-lg p-3 space-y-2">
      {/* Route Progress */}
      <div className="text-center text-sm text-muted-foreground">
        Route {Math.min(currentRoute + 1, totalRoutes)} of {totalRoutes}
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-4">
        {/* Player 1 */}
        <div className="flex-1 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
            P1
          </div>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 rounded-full"
              style={{ width: `${p1Width}%` }}
            />
          </div>
          <span className="font-bold text-lg min-w-[2rem] text-right text-red-500">
            {player1Score}
          </span>
        </div>

        {/* VS Divider */}
        <div className="text-muted-foreground font-bold text-sm">VS</div>

        {/* Player 2 */}
        <div className="flex-1 flex items-center gap-2">
          <span className="font-bold text-lg min-w-[2rem] text-left text-blue-500">
            {player2Score}
          </span>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-l from-blue-500 to-blue-400 transition-all duration-500 rounded-full ml-auto"
              style={{ width: `${p2Width}%` }}
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            P2
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuelScoreBar;
