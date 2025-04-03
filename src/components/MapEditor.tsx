
import React, { useRef, useState, useEffect } from 'react';
import { Circle, Flag, MousePointer, ZoomIn, ZoomOut, Move, X, LineChart } from 'lucide-react';
import { toast } from './ui/use-toast';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import CourseTools, { CourseTool } from './CourseTools';
import { useLanguage } from '../context/LanguageContext';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface MapEditorProps {
  mapUrl: string;
  controls: Control[];
  onAddControl: (control: Control) => void;
  onUpdateControl?: (id: string, x: number, y: number) => void;
  onSelectControl?: (control: Control) => void;
  viewMode?: 'edit' | 'preview';
  allControls?: Control[]; // All controls from all courses for snapping
  snapDistance?: number; // Distance in percentage for snapping
}

const MapEditor: React.FC<MapEditorProps> = ({ 
  mapUrl, 
  controls, 
  onAddControl,
  onUpdateControl,
  onSelectControl,
  viewMode = 'edit',
  allControls = [],
  snapDistance = 2 // Default snap distance in percentage
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<CourseTool>('pointer');
  const [draggedControlId, setDraggedControlId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showConnections, setShowConnections] = useState(true);
  const [showControlNumbers, setShowControlNumbers] = useState(true);
  
  // Handle map click to add a control with snapping
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || 
        selectedTool === 'pointer' || 
        selectedTool === 'zoom-in' || 
        selectedTool === 'zoom-out' ||
        selectedTool === 'move' ||
        viewMode === 'preview') return;
    
    // Get click position relative to the canvas
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    let y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage
    
    // Check if should snap to existing control
    const snapPoint = findSnapPoint(x, y);
    if (snapPoint) {
      x = snapPoint.x;
      y = snapPoint.y;
    }
    
    const controlType = selectedTool as Control['type'];
    
    const newControl: Control = {
      id: `control-${Date.now()}`,
      type: controlType,
      x,
      y,
      number: controlType === 'control' ? 
        controls.filter(c => c.type === 'control').length + 1 : undefined,
      code: controlType === 'control' ? `${controls.filter(c => c.type === 'control').length + 1}` : undefined
    };
    
    onAddControl(newControl);
    
    // If start or finish, automatically switch back to pointer tool
    if (selectedTool === 'start' || selectedTool === 'finish') {
      setSelectedTool('pointer');
    }
  };
  
  // Find a snap point if within snap distance
  const findSnapPoint = (x: number, y: number): {x: number, y: number} | null => {
    if (!snapDistance) return null;
    
    // Check all controls from all courses
    for (const control of allControls) {
      const distance = Math.sqrt(Math.pow(control.x - x, 2) + Math.pow(control.y - y, 2));
      if (distance <= snapDistance) {
        return { x: control.x, y: control.y };
      }
    }
    
    return null;
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
    controlId: string,
    control: Control
  ) => {
    if (selectedTool !== 'pointer' || viewMode === 'preview') return;
    e.stopPropagation();
    setDraggedControlId(controlId);
    if (onSelectControl) {
      onSelectControl(control);
    }
  };
  
  // Handle control click for selection
  const handleControlClick = (
    e: React.MouseEvent<HTMLDivElement>,
    control: Control
  ) => {
    if (viewMode === 'preview') return;
    e.stopPropagation();
    if (onSelectControl) {
      onSelectControl(control);
    }
  };
  
  // Handle mouse move for dragging controls or panning the map
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedControlId && canvasRef.current && onUpdateControl) {
      // Dragging a control
      const rect = canvasRef.current.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Check if should snap to existing control
      const snapPoint = findSnapPoint(x, y);
      if (snapPoint) {
        x = snapPoint.x;
        y = snapPoint.y;
      }
      
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
    if ((selectedTool === 'pointer' || selectedTool === 'move') && !draggedControlId && viewMode !== 'preview') {
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
      if (viewMode === 'preview') return;
      
      if (e.key === 'c') setSelectedTool('control');
      if (e.key === 's') setSelectedTool('start');
      if (e.key === 'f') setSelectedTool('finish');
      if (e.key === 'p') setSelectedTool('pointer');
      if (e.key === 'm') setSelectedTool('move');
      if (e.key === '+') handleZoom('in');
      if (e.key === '-') handleZoom('out');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);
  
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
  
  // Handle tool change
  const handleToolChange = (tool: CourseTool) => {
    setSelectedTool(tool);
  };
  
  // Get sorted controls for drawing connections
  const sortedControls = [...controls]
    .filter(c => c.type === 'control' || c.type === 'start' || c.type === 'finish')
    .sort((a, b) => {
      if (a.type === 'start') return -1;
      if (b.type === 'start') return 1;
      if (a.type === 'finish') return 1;
      if (b.type === 'finish') return -1;
      return (a.number || 0) - (b.number || 0);
    });
  
  // Render special controls based on type
  const renderControl = (control: Control) => {
    switch (control.type) {
      case 'start':
        return (
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
        );
      case 'control':
        return (
          <div className="relative">
            <div className="h-7 w-7 rounded-full border-2 border-purple-600"></div>
            {showControlNumbers && control.number !== undefined && (
              <div className="absolute -top-3 -right-3 bg-white text-purple-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {control.number}
              </div>
            )}
          </div>
        );
      case 'finish':
        return (
          <div className="relative">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
              <circle cx="14" cy="14" r="8" fill="none" stroke="#ef4444" strokeWidth="2" />
            </svg>
          </div>
        );
      case 'crossing-point':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#0284c7" strokeWidth="2" />
              <path d="M8 8L16 16M8 16L16 8" stroke="#0284c7" strokeWidth="2" />
            </svg>
          </div>
        );
      case 'uncrossable-boundary':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12" stroke="#ef4444" strokeWidth="2" />
              <circle cx="3" cy="12" r="2" fill="#ef4444" />
              <circle cx="21" cy="12" r="2" fill="#ef4444" />
            </svg>
          </div>
        );
      case 'out-of-bounds':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth="2" />
              <line x1="3" y1="21" x2="21" y2="3" stroke="#ef4444" strokeWidth="2" />
            </svg>
          </div>
        );
      case 'water-station':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M12 2L4 22H20L12 2Z" fill="none" stroke="#0284c7" strokeWidth="2" />
              <circle cx="12" cy="14" r="4" fill="none" stroke="#0284c7" strokeWidth="1.5" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="relative h-full overflow-hidden">
      {viewMode === 'edit' && (
        <div className="absolute top-2 left-2 z-10">
          <CourseTools 
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
            onResetView={resetView}
          />
          
          <div className="mt-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 space-y-1">
            <div className="flex items-center text-xs">
              <input 
                type="checkbox" 
                id="show-connections" 
                className="mr-1" 
                checked={showConnections}
                onChange={() => setShowConnections(!showConnections)}
              />
              <label htmlFor="show-connections" className="text-xs">
                {t('show.connections')}
              </label>
            </div>
            
            <div className="flex items-center text-xs">
              <input 
                type="checkbox" 
                id="show-numbers" 
                className="mr-1" 
                checked={showControlNumbers}
                onChange={() => setShowControlNumbers(!showControlNumbers)}
              />
              <label htmlFor="show-numbers" className="text-xs">
                {t('show.numbers')}
              </label>
            </div>
          </div>
        </div>
      )}
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div 
        ref={mapContainerRef}
        className="overflow-hidden h-full"
        onMouseDown={handleMapDragStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={canvasRef}
          className="relative cursor-crosshair h-full"
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
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
            draggable={false}
          />
          
          {/* Draw connection lines between controls */}
          {showConnections && sortedControls.length > 1 && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {sortedControls.map((control, index) => {
                if (index === 0) return null; // Skip first control for lines
                
                const prevControl = sortedControls[index - 1];
                
                return (
                  <line 
                    key={`line-${control.id}`}
                    x1={`${prevControl.x}%`}
                    y1={`${prevControl.y}%`}
                    x2={`${control.x}%`}
                    y2={`${control.y}%`}
                    stroke="rgba(128, 0, 128, 0.7)"
                    strokeWidth="2"
                    strokeDasharray={control.type === 'finish' ? "5,5" : "none"}
                  />
                );
              })}
            </svg>
          )}
          
          {/* Render controls on the map */}
          {controls.map(control => (
            <div 
              key={control.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                selectedTool === 'pointer' && viewMode === 'edit' ? 'cursor-move' : 'cursor-default'
              }`}
              style={{ 
                left: `${control.x}%`, 
                top: `${control.y}%`,
              }}
              onMouseDown={(e) => handleControlMouseDown(e, control.id, control)}
              onClick={(e) => handleControlClick(e, control)}
            >
              {renderControl(control)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to translate keys
const t = (key: string): string => {
  // This would typically be handled by your language context
  const translations: Record<string, string> = {
    'pointer.tool': 'Pointer Tool',
    'move.map': 'Move Map',
    'add.control': 'Add Control',
    'add.start': 'Add Start',
    'add.finish': 'Add Finish',
    'zoom.in': 'Zoom In',
    'zoom.out': 'Zoom Out',
    'reset.view': 'Reset View',
    'show.connections': 'Show Connections',
    'show.numbers': 'Show Control Numbers',
    'crossing.point': 'Crossing Point',
    'uncrossable.boundary': 'Uncrossable Boundary',
    'out.of.bounds': 'Out of Bounds',
    'water.station': 'Water Station',
    'advanced.tools': 'Advanced Tools'
  };
  
  return translations[key] || key;
};

export default MapEditor;
