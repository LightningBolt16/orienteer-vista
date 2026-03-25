import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            {isOptimal ? (
              <CheckCircle2 className="h-16 w-16 text-primary" />
            ) : (
              <Target className="h-16 w-16 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isOptimal ? 'Perfect Navigation!' : 'Challenge Complete'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">{timeSeconds}s</span>
              </div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Decision Points</span>
            <span className="font-medium">{totalDecisionPoints}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Wrong Turns</span>
            <div className="flex items-center gap-1">
              {wrongTurns === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">{wrongTurns}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onBackToSelector}>
              Back to Maps
            </Button>
            <Button className="flex-1" onClick={onNextChallenge}>
              Next Challenge
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NavigatorResult;
