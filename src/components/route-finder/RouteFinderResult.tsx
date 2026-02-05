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

  // Calculate actual image bounds within the container (accounting for object-contain)
  const calculateImageBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container || imageDimensions.width === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerRatio = containerRect.width / containerRect.height;
    const imageRatio = imageDimensions.width / imageDimensions.height;

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;

    if (imageRatio > containerRatio) {
      // Image is wider - letterbox top/bottom
      renderWidth = containerRect.width;
      renderHeight = containerRect.width / imageRatio;
      offsetX = 0;
      offsetY = (containerRect.height - renderHeight) / 2;
    } else {
      // Image is taller - letterbox left/right
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

    // Scale user points to canvas coordinates (accounting for image bounds)
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

  // Get score color
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Answer image (shows the pre-rendered correct route) */}
      <img
        src={answerImageUrl}
        alt="Correct route"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Canvas overlay for user's path */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Score display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`
            w-28 h-28 rounded-full flex flex-col items-center justify-center
            bg-background/90 backdrop-blur-sm
            shadow-2xl animate-in zoom-in-50 duration-300
          `}
        >
          <span className={`text-3xl font-bold ${getScoreColor()}`}>
            {score}%
          </span>
          <span className="text-xs text-muted-foreground">Score</span>
        </div>
      </div>

      {/* Stats panel */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Correct:</span>
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

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#FF00FF] rounded" />
            <span className="text-muted-foreground">Your route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#FF0000] rounded" />
            <span className="text-muted-foreground">Correct route</span>
          </div>
        </div>
      </div>

      {/* Feedback message */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-background/90 backdrop-blur-sm px-6 py-3 rounded-lg text-center max-w-sm">
          <p className={`font-semibold ${getScoreColor()}`}>
            {feedback}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Compare your route (magenta) with the correct one (red)
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
