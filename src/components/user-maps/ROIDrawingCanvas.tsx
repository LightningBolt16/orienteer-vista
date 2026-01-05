import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Check } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface ROIDrawingCanvasProps {
  imageUrl: string;
  onComplete: (coordinates: Point[]) => void;
  initialCoordinates?: Point[];
}

const ROIDrawingCanvas: React.FC<ROIDrawingCanvasProps> = ({
  imageUrl,
  onComplete,
  initialCoordinates = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>(initialCoordinates);
  const [isComplete, setIsComplete] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate scale and draw
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !imageLoaded || !imageRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate scale to fit container
    const containerWidth = container.clientWidth;
    const maxHeight = 500;
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = maxHeight / imageDimensions.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);

    // Set canvas size
    canvas.width = imageDimensions.width * newScale;
    canvas.height = imageDimensions.height * newScale;

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw polygon
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x * newScale, points[0].y * newScale);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * newScale, points[i].y * newScale);
      }

      if (isComplete) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x * newScale, point.y * newScale, 6, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#22c55e' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [points, isComplete, imageLoaded, imageDimensions]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isComplete || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Check if clicking near first point to close polygon
    if (points.length >= 3) {
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
      );
      
      if (distance < 20 / scale) {
        setIsComplete(true);
        onComplete(points);
        return;
      }
    }

    setPoints(prev => [...prev, { x: Math.round(x), y: Math.round(y) }]);
  }, [points, isComplete, scale, onComplete]);

  const handleUndo = () => {
    if (isComplete) {
      setIsComplete(false);
    } else {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPoints([]);
    setIsComplete(false);
  };

  const handleConfirm = () => {
    if (points.length >= 3) {
      setIsComplete(true);
      onComplete(points);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isComplete ? (
            <span className="text-green-500">✓ ROI defined ({points.length} points)</span>
          ) : points.length === 0 ? (
            'Click on the map to start drawing the Region of Interest'
          ) : points.length < 3 ? (
            `Add ${3 - points.length} more point(s) to complete`
          ) : (
            'Click near the green point to close, or continue adding points'
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={points.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={points.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
          {points.length >= 3 && !isComplete && (
            <Button
              size="sm"
              onClick={handleConfirm}
            >
              <Check className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-muted"
      >
        {!imageLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-crosshair"
            style={{ display: 'block', maxWidth: '100%' }}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Draw a polygon around the area you want to include for route generation. 
        The polygon should encompass all navigable terrain.
      </p>
    </div>
  );
};

export default ROIDrawingCanvas;
