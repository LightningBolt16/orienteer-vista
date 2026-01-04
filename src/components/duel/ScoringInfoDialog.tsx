import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Info, Zap, Clock, Trophy } from 'lucide-react';

interface ScoringInfoDialogProps {
  gameMode: 'speed' | 'wait';
  gameType: 'routes' | 'timed';
  isOnline?: boolean;
}

const ScoringInfoDialog: React.FC<ScoringInfoDialogProps> = ({ gameMode, gameType, isOnline }) => {
  const isSpeedMode = gameMode === 'speed';
  const isTimedMode = gameType === 'timed';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Scoring Rules
          </DialogTitle>
          <DialogDescription>
            {isSpeedMode ? 'Speed Race Mode' : 'Turn-Based Mode'}
            {isTimedMode ? ' • Time Challenge' : ' • Fixed Routes'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isSpeedMode ? (
            <>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Zap className="h-4 w-4" />
                  Speed Race Rules
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Each player races independently</li>
                  <li>• <span className="text-green-500 font-medium">+1 point</span> for correct answer</li>
                  <li>• <span className="text-red-500 font-medium">-0.5 points</span> for wrong answer</li>
                  <li>• Don't wait for opponent - go fast!</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-sm font-medium">How to Win</div>
                <p className="text-sm text-muted-foreground">
                  {isTimedMode 
                    ? 'Score the most points before time runs out!'
                    : 'Score the most points when both players finish all routes!'
                  }
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <Clock className="h-4 w-4" />
                  Turn-Based Rules
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Both players see the same route</li>
                  <li>• <span className="text-green-500 font-medium">+1 point</span> for correct answer</li>
                  <li>• <span className="text-yellow-500 font-medium">+0.5 speed bonus</span> if both correct & you're faster</li>
                  <li>• Wait for both answers before next round</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-sm font-medium">How to Win</div>
                <p className="text-sm text-muted-foreground">
                  {isTimedMode 
                    ? 'Score the most points before time runs out!'
                    : 'Score the most points after all routes are completed!'
                  }
                </p>
              </div>
            </>
          )}

          {isOnline && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                🌐 You're playing online against a remote opponent!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoringInfoDialog;
