
import React, { useRef, useState, useEffect } from 'react';
import { Circle, Flag, MousePointer, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Button } from './ui/button';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish';
  x: number;
  y: number;
  number?: number;
}

interface MapEditorProps {
  mapUrl: string;
  controls: Control[];
  onAddControl: (control: Control) => void;
  onUpdateControl?: (id: string, x: number, y: number) => void;
}

type Tool = 'pointer' | 'start' | 'control' | 'finish' | 'zoom-in' | 'zoom-out';

const MapEditor: React.FC<MapEditorProps> = ({ 
  mapUrl, 
  controls, 
  onAddControl,
  onUpdateControl 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool>('pointer');
  const [draggedControlId, setDraggedControlId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Handle map click to add a control
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || selectedTool === 'pointer' || 
        selectedTool === 'zoom-in' || selectedTool === 'zoom-out') return;
    
    // Get click position relative to the canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage
    
    const newControl: Control = {
      id: `control-${Date.now()}`,
      type: selectedTool as 'start' | 'control' | 'finish',
      x,
      y,
      number: selectedTool === 'control' ? 
        controls.filter(c => c.type === 'control').length + 1 : undefined
    };
    
    onAddControl(newControl);
    
    // If start or finish, automatically switch back to pointer tool
    if (selectedTool === 'start' || selectedTool === 'finish') {
      setSelectedTool('pointer');
    }
  };
  
  // Track map dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setMapDimensions({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    });
    setMapLoaded(true);
  };
  
  // Start dragging a control
  const handleControlMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    controlId: string
  ) => {
    if (selectedTool !== 'pointer') return;
    e.stopPropagation();
    setDraggedControlId(controlId);
  };
  
  // Handle mouse move for dragging controls or panning the map
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedControlId && canvasRef.current && onUpdateControl) {
      // Dragging a control
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onUpdateControl(draggedControlId, x, y);
    } else if (isDraggingMap && mapContainerRef.current) {
      // Panning the map
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setMapPosition({
        x: mapPosition.x + dx,
        y: mapPosition.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // End dragging
  const handleMouseUp = () => {
    setDraggedControlId(null);
    setIsDraggingMap(false);
  };
  
  // Start panning the map
  const handleMapDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'pointer' && !draggedControlId) {
      setIsDraggingMap(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle zoom operations
  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 0.1, 3));
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    }
  };
  
  // Handle tool click with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c') setSelectedTool('control');
      if (e.key === 's') setSelectedTool('start');
      if (e.key === 'f') setSelectedTool('finish');
      if (e.key === 'p') setSelectedTool('pointer');
      if (e.key === '+') handleZoom('in');
      if (e.key === '-') handleZoom('out');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Map click handler based on selected tool
  const handleToolAction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'zoom-in') {
      handleZoom('in');
      return;
    }
    if (selectedTool === 'zoom-out') {
      handleZoom('out');
      return;
    }
    
    handleMapClick(e);
  };
  
  // Reset map zoom and position
  const resetView = () => {
    setZoomLevel(1);
    setMapPosition({ x: 0, y: 0 });
  };
  
  return (
    <div className="relative border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex flex-col gap-2">
        <ToggleGroup type="single" value={selectedTool} onValueChange={(value: Tool) => value && setSelectedTool(value)}>
          <ToggleGroupItem value="pointer" aria-label="Pointer tool">
            <MousePointer size={18} />
          </ToggleGroupItem>
          <ToggleGroupItem value="control" aria-label="Control point">
            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-purple-600"></div>
          </ToggleGroupItem>
          <ToggleGroupItem value="start" aria-label="Start point">
            <div className="flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 28 28">
                <polygon 
                  points="14,0 28,28 0,28" 
                  fill="none" 
                  stroke="#D946EF" 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem value="finish" aria-label="Finish point">
            <div className="flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
                <circle cx="14" cy="14" r="8" fill="none" stroke="#ef4444" strokeWidth="2" />
              </svg>
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem value="zoom-in" aria-label="Zoom in">
            <ZoomIn size={18} />
          </ToggleGroupItem>
          <ToggleGroupItem value="zoom-out" aria-label="Zoom out">
            <ZoomOut size={18} />
          </ToggleGroupItem>
        </ToggleGroup>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 w-full"
          onClick={resetView}
        >
          Reset View
        </Button>
      </div>
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div 
        ref={mapContainerRef}
        className="overflow-hidden"
        onMouseDown={handleMapDragStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={canvasRef}
          className="relative cursor-crosshair"
          onClick={handleToolAction}
          style={{
            transform: `scale(${zoomLevel}) translate(${mapPosition.x}px, ${mapPosition.y}px)`,
            transformOrigin: 'center',
            transition: 'transform 0.1s ease-out'
          }}
        >
          <img 
            src={mapUrl} 
            alt="Orienteering Map" 
            className="w-full h-auto"
            onLoad={handleImageLoad}
            draggable={false}
          />
          
          {/* Render controls on the map */}
          {controls.map(control => (
            <div 
              key={control.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                selectedTool === 'pointer' ? 'cursor-move' : 'cursor-default'
              }`}
              style={{ 
                left: `${control.x}%`, 
                top: `${control.y}%`,
              }}
              onMouseDown={(e) => handleControlMouseDown(e, control.id)}
            >
              {control.type === 'start' && (
                <div className="relative">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <polygon 
                      points="14,0 28,28 0,28" 
                      fill="none" 
                      stroke="#D946EF" 
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
              
              {control.type === 'control' && (
                <div className="relative">
                  <div className="h-7 w-7 rounded-full border-2 border-purple-600"></div>
                  {control.number !== undefined && (
                    <div className="absolute -top-3 -right-3 bg-white text-purple-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                      {control.number}
                    </div>
                  )}
                </div>
              )}
              
              {control.type === 'finish' && (
                <div className="relative">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
                    <circle cx="14" cy="14" r="8" fill="none" stroke="#ef4444" strokeWidth="2" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapEditor;
