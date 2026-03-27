import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Target, ArrowRight } from 'lucide-react';
import { calculateScore } from '@/utils/routeNavigatorUtils';

interface NavigatorResultProps {
  wrongTurns: number;
  totalDecisionPoints: number;
  timeMs: number;
  onNextChallenge: () => void;
  onBackToSelector: () => void;
}

const NavigatorResult: React.FC<NavigatorResultProps> = ({
  wrongTurns,
  totalDecisionPoints,
  timeMs,
  onNextChallenge,
  onBackToSelector,
}) => {
  const score = calculateScore(wrongTurns, timeMs);
  const isOptimal = wrongTurns === 0;
  const timeSeconds = (timeMs / 1000).toFixed(1);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-background/90 backdrop-blur-md rounded-xl p-5 shadow-2xl border border-border/50">
        <div className="text-center mb-3">
          <div className="flex justify-center mb-2">
            {isOptimal ? (
              <CheckCircle2 className="h-10 w-10 text-primary" />
            ) : (
              <Target className="h-10 w-10 text-primary" />
            )}
          </div>
          <div className="text-lg font-bold">
            {isOptimal ? 'Perfect Navigation!' : 'Challenge Complete'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/60 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-primary">{score}</div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
          <div className="bg-muted/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xl font-bold">{timeSeconds}s</span>
            </div>
            <div className="text-xs text-muted-foreground">Time</div>
          </div>
          <div className="bg-muted/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-0.5">
              {wrongTurns === 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-xl font-bold">{wrongTurns}</span>
            </div>
            <div className="text-xs text-muted-foreground">Wrong</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onBackToSelector}>
            Back
          </Button>
          <Button size="sm" className="flex-1" onClick={onNextChallenge}>
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NavigatorResult;
