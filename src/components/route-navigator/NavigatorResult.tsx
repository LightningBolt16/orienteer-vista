import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Target, ArrowRight, Ruler } from 'lucide-react';

interface NavigatorResultProps {
  correctHits: number;
  totalCorrectNodes: number;
  timeMs: number;
  correctRouteLength: number;
  playerRouteLength: number;
  onNextChallenge: () => void;
  onBackToSelector: () => void;
}

const NavigatorResult: React.FC<NavigatorResultProps> = ({
  correctHits,
  totalCorrectNodes,
  timeMs,
  correctRouteLength,
  playerRouteLength,
  onNextChallenge,
  onBackToSelector,
}) => {
  const ratio = playerRouteLength > 0 ? Math.min(100, Math.round((correctRouteLength / playerRouteLength) * 100)) : 0;
  const isOptimal = ratio >= 98;
  const timeSeconds = (timeMs / 1000).toFixed(1);

  // Format lengths as relative units (pixels → arbitrary "m")
  const formatLen = (px: number) => {
    if (px >= 1000) return `${(px / 1000).toFixed(1)}k`;
    return Math.round(px).toString();
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-background/90 backdrop-blur-md rounded-xl p-5 shadow-2xl border border-border/50">
        {/* Legend */}
        <div className="flex justify-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 rounded bg-[#22c55e]" />
            <span className="text-muted-foreground">Correct route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 rounded bg-[#f97316]" style={{ borderBottom: '2px dashed #f97316' }} />
            <span className="text-muted-foreground">Your route</span>
          </div>
        </div>

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
            <div className="text-xl font-bold text-primary">{ratio}%</div>
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
            <div className="text-xl font-bold">
              {correctHits}/{totalCorrectNodes}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
        </div>

        {/* Route length comparison */}
        <div className="flex justify-between text-xs text-muted-foreground mb-3 px-1">
          <div className="flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            <span>Optimal: {formatLen(correctRouteLength)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            <span>Yours: {formatLen(playerRouteLength)}</span>
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
