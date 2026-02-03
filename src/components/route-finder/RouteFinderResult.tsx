import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight } from 'lucide-react';
import { getPathCoordinates, type RouteFinderGraph } from '@/utils/routeFinderUtils';

interface RouteFinderResultProps {
  isCorrect: boolean;
  responseTime: number;
  baseImageUrl: string;
  userPath: string[];
  optimalPath: string[];
  graph: RouteFinderGraph;
  onNext: () => void;
  stats: { correct: number; total: number };
}

const RouteFinderResult: React.FC<RouteFinderResultProps> = ({
  isCorrect,
  responseTime,
  baseImageUrl,
  userPath,
  optimalPath,
  graph,
  onNext,
  stats,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const formatTime = (ms: number): string => {
    const seconds = ms / 1000;
    return seconds.toFixed(1) + 's';
  };

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = baseImageUrl;
  }, [baseImageUrl]);

  // Draw both paths on canvas
  const drawPaths = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || imageDimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    const scaleX = imageDimensions.width / containerRect.width;
    const scaleY = imageDimensions.height / containerRect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get coordinates for both paths
    const userCoords = getPathCoordinates(userPath, graph);
    const optimalCoords = getPathCoordinates(optimalPath, graph);

    // Draw optimal path first (green, thicker, slightly transparent)
    if (optimalCoords.length >= 2) {
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(optimalCoords[0].x / scaleX, optimalCoords[0].y / scaleY);
      for (let i = 1; i < optimalCoords.length; i++) {
        ctx.lineTo(optimalCoords[i].x / scaleX, optimalCoords[i].y / scaleY);
      }
      ctx.stroke();
    }

    // Draw user path on top (magenta)
    if (userCoords.length >= 2) {
      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(userCoords[0].x / scaleX, userCoords[0].y / scaleY);
      for (let i = 1; i < userCoords.length; i++) {
        ctx.lineTo(userCoords[i].x / scaleX, userCoords[i].y / scaleY);
      }
      ctx.stroke();
    }
  }, [userPath, optimalPath, graph, imageDimensions]);

  useEffect(() => {
    drawPaths();
  }, [drawPaths]);

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => drawPaths();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawPaths]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Base map image */}
      <img
        src={baseImageUrl}
        alt="Map"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Canvas overlay for drawing paths */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

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

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#FF00FF] rounded" />
            <span className="text-muted-foreground">Your route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#22C55E] rounded" />
            <span className="text-muted-foreground">Correct route</span>
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
            Compare your route (magenta) with the correct one (green)
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
