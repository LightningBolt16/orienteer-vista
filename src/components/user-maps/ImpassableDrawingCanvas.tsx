import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2, ZoomIn, ZoomOut, Move, Pentagon, Minus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface ImpassableArea {
  points: Point[];
}

interface ImpassableLine {
  start: Point;
  end: Point;
}

interface ImpassableDrawingCanvasProps {
  imageUrl: string;
  onAnnotationsChange: (areas: ImpassableArea[], lines: ImpassableLine[]) => void;
  initialAreas?: ImpassableArea[];
  initialLines?: ImpassableLine[];
}

type Tool = 'pan' | 'area' | 'line';

const VIOLET_COLOR = '#CD0BCE';
const VIOLET_FILL = 'rgba(205, 11, 190, 0.3)';
const LINE_WIDTH = 4;

const ImpassableDrawingCanvas: React.FC<ImpassableDrawingCanvasProps> = ({
  imageUrl,
  onAnnotationsChange,
  initialAreas = [],
  initialLines = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Image state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('area');
  const [areas, setAreas] = useState<ImpassableArea[]>(initialAreas);
  const [lines, setLines] = useState<ImpassableLine[]>(initialLines);
  
  // Current drawing state
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  
  // Base scale to fit image in container
  const [baseScale, setBaseScale] = useState(1);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setImageLoaded(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate base scale when image loads or container resizes
  useEffect(() => {
    if (!containerRef.current || !imageLoaded) return;
    
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || 500;
      const scaleX = containerWidth / imageDimensions.width;
      const scaleY = containerHeight / imageDimensions.height;
      setBaseScale(Math.min(scaleX, scaleY, 1));
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageLoaded, imageDimensions]);

  // Redraw canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !imageLoaded || !imageRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight || 500;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(baseScale * zoom, baseScale * zoom);
    ctx.translate(-imageDimensions.width / 2, -imageDimensions.height / 2);

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw completed areas
    areas.forEach(area => {
      if (area.points.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      area.points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = VIOLET_FILL;
      ctx.fill();
      ctx.strokeStyle = VIOLET_COLOR;
      ctx.lineWidth = LINE_WIDTH / (baseScale * zoom);
      ctx.stroke();
    });

    // Draw completed lines
    lines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.strokeStyle = VIOLET_COLOR;
      ctx.lineWidth = (LINE_WIDTH * 2) / (baseScale * zoom);
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // Draw current polygon being drawn
    if (currentPoints.length > 0 && activeTool === 'area') {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = VIOLET_COLOR;
      ctx.lineWidth = LINE_WIDTH / (baseScale * zoom);
      ctx.stroke();

      // Draw points
      currentPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8 / (baseScale * zoom), 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#22c55e' : VIOLET_COLOR;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / (baseScale * zoom);
        ctx.stroke();
      });
    }

    // Draw line start point
    if (lineStart && activeTool === 'line') {
      ctx.beginPath();
      ctx.arc(lineStart.x, lineStart.y, 8 / (baseScale * zoom), 0, Math.PI * 2);
      ctx.fillStyle = VIOLET_COLOR;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / (baseScale * zoom);
      ctx.stroke();
    }

    ctx.restore();
  }, [areas, lines, currentPoints, lineStart, imageLoaded, imageDimensions, zoom, pan, baseScale, activeTool]);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    // Reverse the transformations
    const x = (screenX - canvas.width / 2 - pan.x) / (baseScale * zoom) + imageDimensions.width / 2;
    const y = (screenY - canvas.height / 2 - pan.y) / (baseScale * zoom) + imageDimensions.height / 2;
    
    return { x: Math.round(x), y: Math.round(y) };
  }, [pan, zoom, baseScale, imageDimensions]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') return;
    
    const point = screenToImage(e.clientX, e.clientY);
    
    if (activeTool === 'area') {
      // Check if clicking near first point to close polygon
      if (currentPoints.length >= 3) {
        const firstPoint = currentPoints[0];
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        
        const closeThreshold = 20 / (baseScale * zoom);
        if (distance < closeThreshold) {
          const newAreas = [...areas, { points: currentPoints }];
          setAreas(newAreas);
          setCurrentPoints([]);
          onAnnotationsChange(newAreas, lines);
          return;
        }
      }
      setCurrentPoints(prev => [...prev, point]);
    } else if (activeTool === 'line') {
      if (!lineStart) {
        setLineStart(point);
      } else {
        const newLines = [...lines, { start: lineStart, end: point }];
        setLines(newLines);
        setLineStart(null);
        onAnnotationsChange(areas, newLines);
      }
    }
  }, [activeTool, currentPoints, lineStart, areas, lines, screenToImage, baseScale, zoom, onAnnotationsChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan' || e.button === 1) { // Middle mouse button or pan tool
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [activeTool, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.25, Math.min(5, prev + delta)));
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(5, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.25, prev - 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleUndo = () => {
    if (activeTool === 'area' && currentPoints.length > 0) {
      setCurrentPoints(prev => prev.slice(0, -1));
    } else if (activeTool === 'line' && lineStart) {
      setLineStart(null);
    } else if (areas.length > 0 || lines.length > 0) {
      // Remove last annotation
      if (lines.length > 0 && (areas.length === 0 || lines.length >= areas.length)) {
        const newLines = lines.slice(0, -1);
        setLines(newLines);
        onAnnotationsChange(areas, newLines);
      } else {
        const newAreas = areas.slice(0, -1);
        setAreas(newAreas);
        onAnnotationsChange(newAreas, lines);
      }
    }
  };

  const handleClear = () => {
    setAreas([]);
    setLines([]);
    setCurrentPoints([]);
    setLineStart(null);
    onAnnotationsChange([], []);
  };

  const getCursor = () => {
    if (activeTool === 'pan' || isPanning) return 'grab';
    return 'crosshair';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Drawing tools */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={activeTool === 'area' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('area')}
              title="Draw impassable area (polygon)"
            >
              <Pentagon className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('line')}
              title="Draw impassable line"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool('pan')}
              title="Pan/move view"
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetView} title="Reset view">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Edit controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={currentPoints.length === 0 && !lineStart && areas.length === 0 && lines.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={areas.length === 0 && lines.length === 0 && currentPoints.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Status */}
      <div className="text-sm text-muted-foreground">
        {activeTool === 'area' ? (
          currentPoints.length === 0 ? (
            'Click to start drawing an impassable area polygon'
          ) : currentPoints.length < 3 ? (
            `Add ${3 - currentPoints.length} more point(s) to complete`
          ) : (
            'Click near the green point to close polygon, or continue adding points'
          )
        ) : activeTool === 'line' ? (
          !lineStart ? (
            'Click to set the start of an impassable line'
          ) : (
            'Click to set the end point'
          )
        ) : (
          'Click and drag to pan. Use scroll wheel to zoom.'
        )}
        {(areas.length > 0 || lines.length > 0) && (
          <span className="ml-4 text-primary">
            {areas.length} area(s), {lines.length} line(s) drawn
          </span>
        )}
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-muted"
        style={{ height: '500px' }}
      >
        {!imageLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ 
              cursor: getCursor(),
              display: 'block',
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Impassable Area (Symbol 520):</strong> Draw polygons around areas that should be marked as impassable.
        </p>
        <p>
          <strong>Impassable Line (Symbol 521):</strong> Draw lines for linear impassable features like fences or walls.
        </p>
        <p className="text-muted-foreground/70">
          Tip: Use scroll wheel to zoom, or select the pan tool to move around the map.
        </p>
      </div>
    </div>
  );
};

export default ImpassableDrawingCanvas;
