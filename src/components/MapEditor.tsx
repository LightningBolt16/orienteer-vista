
import React, { useRef, useState, useEffect } from 'react';
import { toast } from './ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import CourseTools, { CourseTool } from './CourseTools';
import PrintSettingsDialog, { PrintSettings } from './PrintSettingsDialog';
import { useMapInteractions } from '../hooks/useMapInteractions';
import { useControlInteractions } from '../hooks/useControlInteractions';
import ControlRenderer from './map/ControlRenderer';
import CourseConnections from './map/CourseConnections';
import PrintPreviewOverlay from './map/PrintPreviewOverlay';
import MapDisplayOptions from './map/MapDisplayOptions';

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
  courseScale?: string; // Scale for print preview
  printSettings?: PrintSettings; // Current print settings
  onOpenPrintDialog: () => void;
}

const MapEditor: React.FC<MapEditorProps> = ({ 
  mapUrl, 
  controls, 
  onAddControl,
  onUpdateControl,
  onSelectControl,
  viewMode = 'edit',
  allControls = [],
  snapDistance = 2, // Default snap distance in percentage
  courseScale = '10000',
  printSettings,
  onOpenPrintDialog
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<CourseTool>('pointer');
  const [showConnections, setShowConnections] = useState(true);
  const [showControlNumbers, setShowControlNumbers] = useState(true);
  
  // Custom hooks
  const mapInteractions = useMapInteractions({ viewMode });
  
  const controlInteractions = useControlInteractions({
    controls,
    onUpdateControl,
    onSelectControl,
    selectedTool,
    viewMode,
    canvasRef,
    onAddControl,
    snapDistance,
    allControls
  });
  
  // Handle combined mouse move events from both hooks
  const handleCombinedMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    controlInteractions.handleMouseMove(e);
    mapInteractions.handleMouseMove(e);
  };
  
  // Handle combined mouse up events
  const handleCombinedMouseUp = () => {
    controlInteractions.handleMouseUp();
    mapInteractions.handleMouseUp();
  };
  
  // Track map dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setMapDimensions({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    });
    setMapLoaded(true);
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
  
  // Handle keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'preview') return;
      
      if (e.key === 'c') setSelectedTool('control');
      if (e.key === 's') setSelectedTool('start');
      if (e.key === 'f') setSelectedTool('finish');
      if (e.key === 'p') setSelectedTool('pointer');
      if (e.key === 'm') setSelectedTool('move');
      if (e.key === '+') mapInteractions.handleZoom('in');
      if (e.key === '-') mapInteractions.handleZoom('out');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, mapInteractions]);
  
  // Special tool actions handler
  const handleToolAction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'zoom-in') {
      mapInteractions.handleZoom('in');
      return;
    }
    if (selectedTool === 'zoom-out') {
      mapInteractions.handleZoom('out');
      return;
    }
    
    controlInteractions.handleToolAction(e);
  };
  
  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      {/* Horizontal toolbar at the top */}
      <div className="p-2 border-b">
        <CourseTools 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          onResetView={mapInteractions.resetView}
          onPrint={onOpenPrintDialog}
        />
        
        <MapDisplayOptions 
          showConnections={showConnections}
          setShowConnections={setShowConnections}
          showControlNumbers={showControlNumbers}
          setShowControlNumbers={setShowControlNumbers}
          courseScale={courseScale}
          viewMode={viewMode}
        />
      </div>
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div 
        ref={mapContainerRef}
        className="flex-1 overflow-hidden"
        onMouseDown={mapInteractions.handleMapDragStart}
        onMouseMove={handleCombinedMouseMove}
        onMouseUp={handleCombinedMouseUp}
        onMouseLeave={handleCombinedMouseUp}
      >
        {/* Print preview overlay */}
        <PrintPreviewOverlay viewMode={viewMode} printSettings={printSettings} />
        
        <div 
          ref={canvasRef}
          className="relative cursor-crosshair h-full"
          onClick={handleToolAction}
          style={{
            transform: `scale(${mapInteractions.zoomLevel}) translate(${mapInteractions.mapPosition.x}px, ${mapInteractions.mapPosition.y}px)`,
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
          <CourseConnections 
            sortedControls={sortedControls} 
            showConnections={showConnections}
            viewMode={viewMode}
            printSettings={printSettings}
          />
          
          {/* Render controls on the map */}
          {controls.map(control => (
            <ControlRenderer
              key={control.id}
              control={control}
              showControlNumbers={showControlNumbers}
              selectedTool={selectedTool}
              viewMode={viewMode}
              onMouseDown={controlInteractions.handleControlMouseDown}
              onClick={controlInteractions.handleControlClick}
              printSettings={printSettings}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapEditor;
