import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Check } from 'lucide-react';
import { isPointPassable, type Point, type ImpassabilityMask } from '@/utils/routeFinderUtils';

interface RouteDrawingCanvasProps {
  imageUrl: string;
  onPathComplete: (points: Point[]) => void;
  disabled?: boolean;
  showSubmitButton?: boolean;
  startMarker?: Point;
  finishMarker?: Point;
  impassabilityMask?: ImpassabilityMask | null;
  bboxWidth?: number;
  bboxHeight?: number;
  debugMode?: boolean;
}

const RouteDrawingCanvas: React.FC<RouteDrawingCanvasProps> = ({
  imageUrl,
  onPathComplete,
  disabled = false,
  showSubmitButton = true,
  startMarker,
  finishMarker,
  impassabilityMask,
  bboxWidth,
  bboxHeight,
  debugMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageBounds, setImageBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showImpassableWarning, setShowImpassableWarning] = useState(false);

  // Load image and get dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Use bbox dimensions for coordinate scaling if available, otherwise use image dimensions
  const effectiveBboxWidth = bboxWidth || imageDimensions.width;
  const effectiveBboxHeight = bboxHeight || imageDimensions.height;

  // Calculate actual image bounds within container (accounting for object-contain)
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

  // Draw debug mask overlay
  useEffect(() => {
    if (!debugMode || !impassabilityMask || !debugCanvasRef.current || imageBounds.width === 0) return;

    const canvas = debugCanvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create temporary canvas for the mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = impassabilityMask.width;
    tempCanvas.height = impassabilityMask.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Create ImageData from mask
    const imageData = tempCtx.createImageData(impassabilityMask.width, impassabilityMask.height);
    for (let i = 0; i < impassabilityMask.width * impassabilityMask.height; i++) {
      const maskIdx = i * 4;
      const val = impassabilityMask.data[maskIdx]; // Red channel
      // Make black areas red for visibility
      if (val <= 128) {
        imageData.data[i * 4] = 255;     // Red
        imageData.data[i * 4 + 1] = 0;   // Green
        imageData.data[i * 4 + 2] = 0;   // Blue
        imageData.data[i * 4 + 3] = 200; // Alpha
      } else {
        imageData.data[i * 4 + 3] = 0;   // Transparent for passable
      }
    }
    tempCtx.putImageData(imageData, 0, 0);

    // Draw mask scaled to image bounds
    ctx.drawImage(
      tempCanvas,
      imageBounds.x,
      imageBounds.y,
      imageBounds.width,
      imageBounds.height
    );
  }, [debugMode, impassabilityMask, imageBounds]);

  // Draw paths on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || imageBounds.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale factor from bbox coordinates to canvas pixels
    const scaleX = imageBounds.width / effectiveBboxWidth;
    const scaleY = imageBounds.height / effectiveBboxHeight;

    // Draw style
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw completed paths
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(
        imageBounds.x + path[0].x * scaleX,
        imageBounds.y + path[0].y * scaleY
      );
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(
          imageBounds.x + path[i].x * scaleX,
          imageBounds.y + path[i].y * scaleY
        );
      }
      ctx.stroke();
    }

    // Draw current path
    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(
        imageBounds.x + currentPath[0].x * scaleX,
        imageBounds.y + currentPath[0].y * scaleY
      );
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(
          imageBounds.x + currentPath[i].x * scaleX,
          imageBounds.y + currentPath[i].y * scaleY
        );
      }
      ctx.stroke();
    }

    // Draw start marker
    if (startMarker) {
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(
        imageBounds.x + startMarker.x * scaleX,
        imageBounds.y + startMarker.y * scaleY,
        12,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw finish marker
    if (finishMarker) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(
        imageBounds.x + finishMarker.x * scaleX,
        imageBounds.y + finishMarker.y * scaleY,
        12,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [paths, currentPath, imageBounds, effectiveBboxWidth, effectiveBboxHeight, startMarker, finishMarker]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get point from mouse/touch event (in bbox coordinates)
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const container = containerRef.current;
    if (!container || imageBounds.width === 0) return null;

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

    // Get position relative to container
    const containerX = clientX - rect.left;
    const containerY = clientY - rect.top;

    // Check if click is within image bounds
    if (
      containerX < imageBounds.x ||
      containerX > imageBounds.x + imageBounds.width ||
      containerY < imageBounds.y ||
      containerY > imageBounds.y + imageBounds.height
    ) {
      return null; // Click was in letterbox area
    }

    // Convert to image coordinates, then scale to bbox coordinates
    const imageX = containerX - imageBounds.x;
    const imageY = containerY - imageBounds.y;

    return {
      x: (imageX / imageBounds.width) * effectiveBboxWidth,
      y: (imageY / imageBounds.height) * effectiveBboxHeight,
    };
  };

  // Check if point is on passable terrain
  const checkPassable = (point: Point): boolean => {
    if (!impassabilityMask) return true;
    return isPointPassable(point, impassabilityMask, effectiveBboxWidth, effectiveBboxHeight);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (!point) return;

    // Check if starting on impassable terrain
    if (!checkPassable(point)) {
      setShowImpassableWarning(true);
      setTimeout(() => setShowImpassableWarning(false), 1500);
      return;
    }

    setIsDrawing(true);
    setCurrentPath([point]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const point = getPointFromEvent(e);
    if (!point) return;

    // Check if drawing on impassable terrain - show warning but still record the point
    if (!checkPassable(point)) {
      setShowImpassableWarning(true);
      setTimeout(() => setShowImpassableWarning(false), 500);
    }

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

      {/* Debug mask overlay */}
      {debugMode && (
        <canvas
          ref={debugCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.5 }}
        />
      )}

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

      {/* Debug mode indicator */}
      {debugMode && (
        <div className="absolute top-14 left-4 z-10 bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
          DEBUG MODE
        </div>
      )}

      {/* Impassable terrain warning */}
      {showImpassableWarning && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
          <div className="bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-lg animate-in zoom-in-50 duration-200">
            <p className="text-white font-semibold text-sm">
              ⚠️ Impassable terrain!
            </p>
          </div>
        </div>
      )}

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
