import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, Check } from 'lucide-react';
import { isPointPassable, type Point, type ImpassabilityMask } from '@/utils/routeFinderUtils';
import { useLanguage } from '@/context/LanguageContext';

interface GraphNode {
  id: string;
  x: number;
  y: number;
}

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
  graphNodes?: GraphNode[];
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
  graphNodes,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphNodesCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // Draw graph nodes overlay in debug mode
  useEffect(() => {
    if (!debugMode || !graphNodes || !graphNodesCanvasRef.current || imageBounds.width === 0) return;

    const canvas = graphNodesCanvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale factor from bbox coordinates to canvas pixels
    const scaleX = imageBounds.width / effectiveBboxWidth;
    const scaleY = imageBounds.height / effectiveBboxHeight;

    // Draw each graph node as a small cyan dot
    ctx.fillStyle = '#00FFFF';
    for (const node of graphNodes) {
      ctx.beginPath();
      ctx.arc(
        imageBounds.x + node.x * scaleX,
        imageBounds.y + node.y * scaleY,
        4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }, [debugMode, graphNodes, imageBounds, effectiveBboxWidth, effectiveBboxHeight]);

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

    // Note: Start and finish markers are rendered server-side in the base image
    // The startMarker and finishMarker props are kept for potential future undo-to-intersection feature
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

    // Block drawing on impassable terrain entirely
    if (!checkPassable(point)) {
      setShowImpassableWarning(true);
      setTimeout(() => setShowImpassableWarning(false), 500);
      return; // Don't record the point
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

      {/* Debug graph nodes overlay */}
      {debugMode && graphNodes && (
        <canvas
          ref={graphNodesCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
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

      {/* Impassable terrain warning - red vignette + corner text */}
      {showImpassableWarning && (
        <div className="absolute inset-0 pointer-events-none z-20 animate-in fade-in duration-200">
          <div className="absolute inset-0 rounded-lg" style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(239, 68, 68, 0.3) 100%)',
          }} />
          <div className="absolute bottom-14 left-4 bg-red-600/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
            {t('impassableTerrain')}
          </div>
        </div>
      )}

      {/* Controls - bottom-right corner to minimize drawing obstruction */}
      <div className="absolute bottom-3 right-3 z-30 flex gap-1.5 pointer-events-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleUndo(); }}
          disabled={disabled || paths.length === 0}
          className="bg-background/80 backdrop-blur-sm h-8 px-2"
        >
          <Undo2 className="h-3.5 w-3.5 mr-1" />
          {t('undo')}
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleClear(); }}
          disabled={disabled || !hasDrawing}
          className="bg-background/80 backdrop-blur-sm h-8 px-2"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {t('clear')}
        </Button>

        {showSubmitButton && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
            disabled={disabled || paths.length === 0}
            className="bg-primary/90 backdrop-blur-sm h-8 px-2"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {t('submit')}
          </Button>
        )}
      </div>

      {/* Drawing instructions - small corner hint instead of center overlay */}
      {!hasDrawing && !disabled && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full">
            <p className="text-xs text-muted-foreground">
              {t('drawYourRoute')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteDrawingCanvas;
