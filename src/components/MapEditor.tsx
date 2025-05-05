
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
import CourseSettingsDialog from './course-setter/CourseSettingsDialog';
import { useCourseSettings, ORIENTEERING_PURPLE } from '../hooks/useCourseSettings';
import { Flag, Circle, Square, Plus, X, Slash, Droplets } from 'lucide-react';

interface Control {
  id: string;
  type: string;
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
  hideDisplayOptions?: boolean; // New prop to hide display options
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
  onOpenPrintDialog,
  hideDisplayOptions = false
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<CourseTool>('pointer');
  const [showConnections, setShowConnections] = useState(true);
  const [showControlNumbers, setShowControlNumbers] = useState(true);
  
  // Use our course settings hook
  const { 
    settings, 
    saveSettings, 
    getEnabledTools, 
    settingsDialogOpen,
    setSettingsDialogOpen
  } = useCourseSettings();
  
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
  
  // Get advanced tools that are enabled
  const advancedTools = getEnabledTools().map(tool => {
    // Add icons based on tool type
    let icon;
    switch(tool.id) {
      case 'timed-start':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1={5} y1={6} x2={5} y2={18} stroke={settings.controlCircle.color} strokeWidth={2} />
              <path d={`M5,6 L18,12 L5,18 Z`} fill={settings.controlCircle.color} />
            </svg>
          </div>
        );
        break;
      case 'mandatory-crossing':
      case 'optional-crossing':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke={settings.controlCircle.color} strokeWidth="2" />
              <path d="M8 8L16 16M8 16L16 8" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'out-of-bounds':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" fill="none" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="4" y1="4" x2="20" y2="20" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="4" y1="20" x2="20" y2="4" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'temporary-construction':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" fill="none" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'water-location':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M6,8 L6,16 C6,18 12,18 12,16 L12,8 Z" fill="none" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="6" y1="10" x2="12" y2="10" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'first-aid':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="4" x2="12" y2="20" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="4" y1="12" x2="20" y2="12" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'forbidden-route':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="4" y1="4" x2="20" y2="20" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="4" y1="20" x2="20" y2="4" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      case 'uncrossable-boundary':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12" stroke={settings.controlCircle.color} strokeWidth="2" />
              <circle cx="3" cy="12" r="2" fill={settings.controlCircle.color} />
              <circle cx="21" cy="12" r="2" fill={settings.controlCircle.color} />
            </svg>
          </div>
        );
        break;
      case 'registration-mark':
        icon = (
          <div className="flex items-center justify-center w-6 h-6">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="6" x2="12" y2="18" stroke={settings.controlCircle.color} strokeWidth="2" />
              <line x1="6" y1="12" x2="18" y2="12" stroke={settings.controlCircle.color} strokeWidth="2" />
            </svg>
          </div>
        );
        break;
      default:
        icon = null;
    }
    
    return {
      ...tool,
      icon,
      label: t(`tool.${tool.id}`) || tool.label,
    };
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

  // Handle opening settings dialog
  const handleOpenSettings = () => {
    setSettingsDialogOpen(true);
  };

  // Add wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      mapInteractions.handleZoom('in');
    } else {
      mapInteractions.handleZoom('out');
    }
  };

  // Determine if the toolbar should be disabled
  const isToolbarDisabled = viewMode === 'preview';
  
  // Get sorted controls for drawing connections
  const sortedControls = [...controls]
    .filter(c => c.type === 'control' || c.type === 'start' || c.type === 'finish' || c.type === 'timed-start' || c.type === 'mandatory-crossing')
    .sort((a, b) => {
      if (a.type === 'timed-start') return -1;
      if (b.type === 'timed-start') return 1;
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
      
      if (e.key.toLowerCase() === 'c') setSelectedTool('control');
      if (e.key.toLowerCase() === 's') setSelectedTool('start');
      if (e.key.toLowerCase() === 'f') setSelectedTool('finish');
      if (e.key.toLowerCase() === 'p') setSelectedTool('pointer');
      if (e.key.toLowerCase() === 'm') setSelectedTool('move');
      
      // Also check for advanced tool shortcuts
      getEnabledTools().forEach(tool => {
        if (tool.shortcut && e.key.toLowerCase() === tool.shortcut.toLowerCase()) {
          setSelectedTool(tool.id as CourseTool);
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, getEnabledTools]);
  
  // Special tool actions handler
  const handleToolAction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === 'preview') return;
    controlInteractions.handleToolAction(e);
  };
  
  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      {/* Horizontal toolbar at the top */}
      <div className="p-2 border-b">
        <CourseTools 
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          onOpenSettings={handleOpenSettings}
          disabled={isToolbarDisabled}
          enabledTools={advancedTools}
          controlColor={settings.controlCircle.color}
        />
        
        {!hideDisplayOptions && (
          <MapDisplayOptions 
            showConnections={showConnections}
            setShowConnections={setShowConnections}
            showControlNumbers={showControlNumbers}
            setShowControlNumbers={setShowControlNumbers}
            courseScale={courseScale}
            viewMode={viewMode}
          />
        )}
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
        onWheel={handleWheel}
      >
        {/* Print preview overlay - now properly controlled by viewMode */}
        <PrintPreviewOverlay viewMode={viewMode} printSettings={printSettings} />
        
        <div 
          ref={canvasRef}
          className="relative cursor-crosshair h-full"
          onClick={viewMode === 'preview' ? undefined : handleToolAction}
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
          
          {/* Draw connection lines between controls - excluding advanced tools */}
          <CourseConnections 
            sortedControls={sortedControls} 
            showConnections={showConnections}
            viewMode={viewMode}
            printSettings={printSettings}
            lineColor={settings.line.color}
            lineThickness={settings.line.thickness}
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
              settings={settings}
            />
          ))}
        </div>
      </div>
      
      {/* Course Settings Dialog */}
      <CourseSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onSettingsChange={saveSettings}
      />
    </div>
  );
};

export default MapEditor;
