import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight } from 'lucide-react';
import type { RouteFinderGraph } from '@/utils/routeFinderUtils';

interface RouteFinderResultProps {
  isCorrect: boolean;
  responseTime: number;
  answerImageUrl: string;
  userPath: string[];
  optimalPath: string[];
  graph: RouteFinderGraph;
  onNext: () => void;
  stats: { correct: number; total: number };
}

const RouteFinderResult: React.FC<RouteFinderResultProps> = ({
  isCorrect,
  responseTime,
  answerImageUrl,
  onNext,
  stats,
}) => {
  const formatTime = (ms: number): string => {
    const seconds = ms / 1000;
    return seconds.toFixed(1) + 's';
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Answer image with overlay */}
      <img
        src={answerImageUrl}
        alt="Correct route"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Result overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`
            w-24 h-24 rounded-full flex items-center justify-center
            ${isCorrect ? 'bg-green-500/90' : 'bg-red-500/90'}
            shadow-2xl animate-in zoom-in-50 duration-300
          `}
        >
          {isCorrect ? (
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          ) : (
            <X className="h-12 w-12 text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Stats panel */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="font-semibold text-green-500">{stats.correct}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time:</span>
            <span className="font-mono font-medium">{formatTime(responseTime)}</span>
          </div>
        </div>
      </div>

      {/* Feedback message */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-background/90 backdrop-blur-sm px-6 py-3 rounded-lg text-center">
          {isCorrect ? (
            <p className="text-green-500 font-semibold">
              ✓ You found the shortest route!
            </p>
          ) : (
            <p className="text-red-500 font-semibold">
              ✗ Not the shortest route
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            The correct route is shown on the map
          </p>
        </div>
      </div>

      {/* Next button */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <Button
          size="lg"
          onClick={onNext}
          className="gap-2"
        >
          Next Challenge
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RouteFinderResult;
