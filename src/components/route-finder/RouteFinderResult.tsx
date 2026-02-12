import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { type Point } from '@/utils/routeFinderUtils';

interface RouteFinderResultProps {
  score: number;
  feedback: string;
  responseTime: number;
  answerImageUrl: string;
  userPoints: Point[];
  onNext: () => void;
  stats: { correct: number; total: number };
  imageDimensions: { width: number; height: number };
}

const RouteFinderResult: React.FC<RouteFinderResultProps> = ({
  score,
  feedback,
  responseTime,
  answerImageUrl,
  userPoints,
  onNext,
  stats,
  imageDimensions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageBounds, setImageBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const formatTime = (ms: number): string => {
    const seconds = ms / 1000;
    return seconds.toFixed(1) + 's';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Calculate actual image bounds within the container (accounting for object-contain)
  const calculateImageBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container || imageDimensions.width === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerRatio = containerRect.width / containerRect.height;
    const imageRatio = imageDimensions.width / imageDimensions.height;

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;

    if (imageRatio > containerRatio) {
      renderWidth = containerRect.width;
      renderHeight = containerRect.width / imageRatio;
      offsetX = 0;
      offsetY = (containerRect.height - renderHeight) / 2;
    } else {
      renderHeight = containerRect.height;
      renderWidth = containerRect.height * imageRatio;
      offsetX = (containerRect.width - renderWidth) / 2;
      offsetY = 0;
    }

    setImageBounds({ x: offsetX, y: offsetY, width: renderWidth, height: renderHeight });
  }, [imageDimensions]);

  useEffect(() => {
    calculateImageBounds();
    window.addEventListener('resize', calculateImageBounds);
    return () => window.removeEventListener('resize', calculateImageBounds);
  }, [calculateImageBounds]);

  // Draw user's path on canvas
  const drawUserPath = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || imageBounds.width === 0 || userPoints.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = imageBounds.width / imageDimensions.width;
    const scaleY = imageBounds.height / imageDimensions.height;

    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    ctx.moveTo(
      imageBounds.x + userPoints[0].x * scaleX,
      imageBounds.y + userPoints[0].y * scaleY
    );
    for (let i = 1; i < userPoints.length; i++) {
      ctx.lineTo(
        imageBounds.x + userPoints[i].x * scaleX,
        imageBounds.y + userPoints[i].y * scaleY
      );
    }
    ctx.stroke();
  }, [userPoints, imageBounds, imageDimensions]);

  useEffect(() => {
    drawUserPath();
  }, [drawUserPath]);

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Top bar - matches drawing screen layout */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 shrink-0">
        {/* Left: score + feedback */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-lg font-bold ${getScoreColor()}`}>
            {score}%
          </span>
          <span className={`text-sm font-medium ${getScoreColor()} hidden sm:inline`}>
            {feedback}
          </span>
        </div>

        {/* Center: legend */}
        <div className="flex items-center gap-4 justify-center flex-1">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-1 bg-[#FF00FF] rounded" />
            <span className="text-muted-foreground">Your route</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-1 bg-[#FF0000] rounded" />
            <span className="text-muted-foreground">Correct route</span>
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            <span className="text-green-600 dark:text-green-400">{stats.correct}</span>
            <span className="text-muted-foreground">/{stats.total}</span>
          </span>
          <span className="text-sm text-muted-foreground font-mono">{formatTime(responseTime)}</span>
        </div>
      </div>

      {/* Map area - takes remaining space, completely unobstructed */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <img
          src={answerImageUrl}
          alt="Correct route"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Bottom bar - Next button, centered */}
      <div className="flex items-center justify-center px-3 py-2 border-t border-border bg-muted/50 shrink-0">
        <Button
          size="sm"
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
