import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Check } from 'lucide-react';
import type { Point } from '@/utils/routeFinderUtils';

interface RouteDrawingCanvasProps {
  imageUrl: string;
  onPathComplete: (points: Point[]) => void;
  disabled?: boolean;
  showSubmitButton?: boolean;
  startMarker?: Point;
  finishMarker?: Point;
}

const RouteDrawingCanvas: React.FC<RouteDrawingCanvasProps> = ({
  imageUrl,
  onPathComplete,
  disabled = false,
  showSubmitButton = true,
  startMarker,
  finishMarker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image and get dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw paths on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get container dimensions for scaling
    const containerRect = container.getBoundingClientRect();
    const scaleX = imageDimensions.width / containerRect.width;
    const scaleY = imageDimensions.height / containerRect.height;

    // Set canvas size to match image dimensions
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Draw style
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw completed paths
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x / scaleX, path[0].y / scaleY);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x / scaleX, path[i].y / scaleY);
      }
      ctx.stroke();
    }

    // Draw current path
    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x / scaleX, currentPath[0].y / scaleY);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x / scaleX, currentPath[i].y / scaleY);
      }
      ctx.stroke();
    }

    // Draw start marker
    if (startMarker) {
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(startMarker.x / scaleX, startMarker.y / scaleY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw finish marker
    if (finishMarker) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(finishMarker.x / scaleX, finishMarker.y / scaleY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [paths, currentPath, imageDimensions, startMarker, finishMarker]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get point from mouse/touch event
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate position relative to container, then scale to image coordinates
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentPath([point]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const point = getPointFromEvent(e);
    if (!point) return;

    setCurrentPath(prev => [...prev, point]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 1) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const handleSubmit = () => {
    // Combine all paths into one continuous path
    const allPoints = paths.flat();
    if (allPoints.length > 0) {
      onPathComplete(allPoints);
    }
  };

  const hasDrawing = paths.length > 0 || currentPath.length > 0;

  return (
    <div className="relative w-full h-full">
      {/* Background image */}
      <img
        src={imageUrl}
        alt="Map"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Drawing canvas overlay */}
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUndo}
          disabled={disabled || paths.length === 0}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={disabled || !hasDrawing}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>

        {showSubmitButton && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || paths.length === 0}
            className="bg-primary/90 backdrop-blur-sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Submit
          </Button>
        )}
      </div>

      {/* Drawing instructions */}
      {!hasDrawing && !disabled && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Draw your route from start to finish
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteDrawingCanvas;
