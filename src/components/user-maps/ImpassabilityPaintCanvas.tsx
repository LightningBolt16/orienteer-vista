import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Move, RotateCcw, Paintbrush, Eraser, Undo2 } from 'lucide-react';

interface ImpassabilityPaintCanvasProps {
  imageUrl: string;
  onExport: (blob: Blob) => void;
  width?: number;
  height?: number;
}

const ImpassabilityPaintCanvas: React.FC<ImpassabilityPaintCanvasProps> = ({
  imageUrl,
  onExport,
  width: canvasContainerWidth,
  height: canvasContainerHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  // Off-screen canvas at full image resolution for edits
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);

  const [tool, setTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Undo stack: stores ImageData snapshots
  const undoStack = useRef<ImageData[]>([]);
  const MAX_UNDO = 20;

  // Load image
  useEffect(() => {
    setImageError(null);
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageDims({ width: img.width, height: img.height });
      setImageLoaded(true);

      // Create off-screen edit canvas at image resolution
      const offscreen = document.createElement('canvas');
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      editCanvasRef.current = offscreen;

      // Save initial state
      undoStack.current = [ctx.getImageData(0, 0, img.width, img.height)];
    };
    img.onerror = () => {
      setImageError('Failed to load the impassability image. The URL may be invalid or inaccessible.');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate base scale
  useEffect(() => {
    if (!containerRef.current || !imageLoaded) return;
    const update = () => {
      const c = containerRef.current;
      if (!c) return;
      const sx = c.clientWidth / imageDims.width;
      const sy = (c.clientHeight || 500) / imageDims.height;
      setBaseScale(Math.min(sx, sy, 1));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [imageLoaded, imageDims]);

  // Redraw display canvas
  const redraw = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const container = containerRef.current;
    const editCanvas = editCanvasRef.current;
    if (!canvas || !container || !editCanvas || !imageLoaded) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight || 500;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(baseScale * zoom, baseScale * zoom);
    ctx.translate(-imageDims.width / 2, -imageDims.height / 2);

    // Draw the edited image
    ctx.drawImage(editCanvas, 0, 0);
    ctx.restore();
  }, [imageLoaded, imageDims, zoom, pan, baseScale]);

  useEffect(() => { redraw(); }, [redraw]);

  const screenToImage = useCallback((clientX: number, clientY: number) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const x = (sx - canvas.width / 2 - pan.x) / (baseScale * zoom) + imageDims.width / 2;
    const y = (sy - canvas.height / 2 - pan.y) / (baseScale * zoom) + imageDims.height / 2;
    return { x, y };
  }, [pan, zoom, baseScale, imageDims]);

  const saveUndoState = useCallback(() => {
    const editCanvas = editCanvasRef.current;
    if (!editCanvas) return;
    const ctx = editCanvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    undoStack.current.push(data);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
  }, []);

  const paintAt = useCallback((x: number, y: number) => {
    const editCanvas = editCanvasRef.current;
    if (!editCanvas) return;
    const ctx = editCanvas.getContext('2d')!;

    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'black';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'white';
    }

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    redraw();
  }, [tool, brushSize, redraw]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      return;
    }
    saveUndoState();
    setIsDrawing(true);
    const pt = screenToImage(e.clientX, e.clientY);
    paintAt(pt.x, pt.y);
  }, [tool, pan, screenToImage, paintAt, saveUndoState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (isDrawing && (tool === 'brush' || tool === 'eraser')) {
      const pt = screenToImage(e.clientX, e.clientY);
      paintAt(pt.x, pt.y);
    }
  }, [isPanning, panStart, isDrawing, tool, screenToImage, paintAt]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.25, Math.min(8, prev + delta)));
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length <= 1) return;
    undoStack.current.pop();
    const prev = undoStack.current[undoStack.current.length - 1];
    const editCanvas = editCanvasRef.current;
    if (!editCanvas || !prev) return;
    const ctx = editCanvas.getContext('2d')!;
    ctx.putImageData(prev, 0, 0);
    redraw();
  }, [redraw]);

  const handleExport = useCallback(() => {
    const editCanvas = editCanvasRef.current;
    if (!editCanvas) return;
    editCanvas.toBlob((blob) => {
      if (blob) onExport(blob);
    }, 'image/png');
  }, [onExport]);

  const getCursor = () => {
    if (tool === 'pan' || isPanning) return 'grab';
    return 'crosshair';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={tool === 'brush' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('brush')}
              title="Paint impassable (black)"
            >
              <Paintbrush className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('eraser')}
              title="Erase (white)"
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('pan')}
              title="Pan"
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={() => setZoom(p => Math.max(0.25, p - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(p => Math.min(8, p + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Brush: {brushSize}px</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={5}
              max={100}
              step={1}
              className="w-28"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo2 className="h-4 w-4 mr-1" /> Undo
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="text-sm text-muted-foreground">
        {tool === 'brush' ? 'Click/drag to paint impassable areas (black)' :
         tool === 'eraser' ? 'Click/drag to erase impassable areas (white)' :
         'Click and drag to pan. Scroll to zoom.'}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-muted"
        style={{ height: '500px' }}
      >
        {!imageLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <canvas
            ref={displayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: getCursor(), display: 'block', width: '100%', height: '100%' }}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExport}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default ImpassabilityPaintCanvas;
