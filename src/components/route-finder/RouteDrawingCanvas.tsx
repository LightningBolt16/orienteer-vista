import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { isPointPassable, type Point, type ImpassabilityMask } from '@/utils/routeFinderUtils';

interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface RouteDrawingCanvasHandle {
  undo: () => void;
  clear: () => void;
  submit: () => void;
  hasDrawing: boolean;
  canUndo: boolean;
}

interface RouteDrawingCanvasProps {
  imageUrl: string;
  onPathComplete: (points: Point[]) => void;
  disabled?: boolean;
  startMarker?: Point;
  finishMarker?: Point;
  impassabilityMask?: ImpassabilityMask | null;
  bboxWidth?: number;
  bboxHeight?: number;
  debugMode?: boolean;
  graphNodes?: GraphNode[];
  onImpassableWarning?: (show: boolean) => void;
  showImpassableVignette?: boolean;
}

const RouteDrawingCanvas = forwardRef<RouteDrawingCanvasHandle, RouteDrawingCanvasProps>(({
  imageUrl,
  onPathComplete,
  disabled = false,
  startMarker,
  finishMarker,
  impassabilityMask,
  bboxWidth,
  bboxHeight,
  debugMode = false,
  graphNodes,
  onImpassableWarning,
  showImpassableVignette = false,
}, ref) => {
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

  const hasDrawing = paths.length > 0 || currentPath.length > 0;
  const canUndo = paths.length > 0;

  // Expose actions to parent
  useImperativeHandle(ref, () => ({
    undo: () => setPaths(prev => prev.slice(0, -1)),
    clear: () => { setPaths([]); setCurrentPath([]); },
    submit: () => {
      const allPoints = paths.flat();
      if (allPoints.length > 0) {
        onPathComplete(allPoints);
      }
    },
    hasDrawing,
    canUndo,
  }), [hasDrawing, canUndo, paths, onPathComplete]);

  // Load image and get dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

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

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = impassabilityMask.width;
    tempCanvas.height = impassabilityMask.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const imageData = tempCtx.createImageData(impassabilityMask.width, impassabilityMask.height);
    for (let i = 0; i < impassabilityMask.width * impassabilityMask.height; i++) {
      const maskIdx = i * 4;
      const val = impassabilityMask.data[maskIdx];
      if (val <= 128) {
        imageData.data[i * 4] = 255;
        imageData.data[i * 4 + 1] = 0;
        imageData.data[i * 4 + 2] = 0;
        imageData.data[i * 4 + 3] = 200;
      } else {
        imageData.data[i * 4 + 3] = 0;
      }
    }
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
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

    const scaleX = imageBounds.width / effectiveBboxWidth;
    const scaleY = imageBounds.height / effectiveBboxHeight;

    ctx.fillStyle = '#00FFFF';
    for (const node of graphNodes) {
      ctx.beginPath();
      ctx.arc(imageBounds.x + node.x * scaleX, imageBounds.y + node.y * scaleY, 4, 0, Math.PI * 2);
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

    const scaleX = imageBounds.width / effectiveBboxWidth;
    const scaleY = imageBounds.height / effectiveBboxHeight;

    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(imageBounds.x + path[0].x * scaleX, imageBounds.y + path[0].y * scaleY);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(imageBounds.x + path[i].x * scaleX, imageBounds.y + path[i].y * scaleY);
      }
      ctx.stroke();
    }

    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(imageBounds.x + currentPath[0].x * scaleX, imageBounds.y + currentPath[0].y * scaleY);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(imageBounds.x + currentPath[i].x * scaleX, imageBounds.y + currentPath[i].y * scaleY);
      }
      ctx.stroke();
    }
  }, [paths, currentPath, imageBounds, effectiveBboxWidth, effectiveBboxHeight]);

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

    const containerX = clientX - rect.left;
    const containerY = clientY - rect.top;

    if (
      containerX < imageBounds.x ||
      containerX > imageBounds.x + imageBounds.width ||
      containerY < imageBounds.y ||
      containerY > imageBounds.y + imageBounds.height
    ) {
      return null;
    }

    const imageX = containerX - imageBounds.x;
    const imageY = containerY - imageBounds.y;

    return {
      x: (imageX / imageBounds.width) * effectiveBboxWidth,
      y: (imageY / imageBounds.height) * effectiveBboxHeight,
    };
  };

  const checkPassable = (point: Point): boolean => {
    if (!impassabilityMask) return true;
    return isPointPassable(point, impassabilityMask, effectiveBboxWidth, effectiveBboxHeight);
  };

  const triggerImpassableWarning = (duration: number) => {
    onImpassableWarning?.(true);
    setTimeout(() => onImpassableWarning?.(false), duration);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (!point) return;

    if (!checkPassable(point)) {
      triggerImpassableWarning(1500);
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

    if (!checkPassable(point)) {
      triggerImpassableWarning(500);
      return;
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

      {/* Red vignette overlay for impassable terrain warning */}
      {showImpassableVignette && (
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(239, 68, 68, 0.35) 100%)',
          }}
        />
      )}

      {/* Debug mode indicator */}
      {debugMode && (
        <div className="absolute top-2 left-2 z-10 bg-destructive/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-destructive-foreground font-medium">
          DEBUG MODE
        </div>
      )}
    </div>
  );
});

RouteDrawingCanvas.displayName = 'RouteDrawingCanvas';

export default RouteDrawingCanvas;
