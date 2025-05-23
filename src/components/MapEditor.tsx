
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
import { useCourseSettings } from '../hooks/useCourseSettings';
import { buildToolIcons } from './map/ToolIconsBuilder';
import MapEventHandlers from './map/MapEventHandlers';

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
  
  // Use the controlInteractions hook for control management
  const controlInteractions = useControlInteractions({
    controls,
    onUpdateControl,
    onSelectControl,
    selectedTool,
    viewMode,
    canvasRef: mapContainerRef, // Use mapContainerRef for correct positioning
    onAddControl,
    snapDistance,
    allControls
  });
  
  // Get advanced tools that are enabled and add icons
  const advancedTools = buildToolIcons(
    getEnabledTools(), 
    settings.controlCircle.color
  );
  
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
  // Include both basic and advanced point types that should be connected
  const sortedControls = [...controls]
    .filter(c => ['control', 'start', 'finish', 'timed-start', 'mandatory-crossing'].includes(c.type))
    .sort((a, b) => {
      if (a.type === 'timed-start') return -1;
      if (b.type === 'timed-start') return 1;
      if (a.type === 'start') return -1;
      if (b.type === 'start') return 1;
      if (a.type === 'finish') return 1;
      if (b.type === 'finish') return -1;
      return (a.number || 0) - (b.number || 0);
    });
  
  // Find the next control after start for rotation
  const findNextControlAfterStart = () => {
    const startIndex = sortedControls.findIndex(c => c.type === 'start');
    if (startIndex >= 0 && startIndex < sortedControls.length - 1) {
      return sortedControls[startIndex + 1];
    }
    return null;
  };

  // Handle keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'preview') return;
      
      // Check for basic tool shortcuts
      if (e.key.toLowerCase() === 'c') setSelectedTool('control');
      if (e.key.toLowerCase() === 's') setSelectedTool('start');
      if (e.key.toLowerCase() === 'f') setSelectedTool('finish');
      if (e.key.toLowerCase() === 'p') setSelectedTool('pointer');
      if (e.key.toLowerCase() === 'm') setSelectedTool('move');
      
      // Check for advanced tool shortcuts
      getEnabledTools().forEach(tool => {
        if (tool.shortcut && e.key.toLowerCase() === tool.shortcut.toLowerCase()) {
          setSelectedTool(tool.id as CourseTool);
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, getEnabledTools]);
  
  // Handle tool action (map click to add control)
  const handleToolAction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === 'edit' && selectedTool !== 'pointer' && selectedTool !== 'move') {
      controlInteractions.handleToolAction(e);
    }
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
      
      <MapEventHandlers
        handleMapDragStart={mapInteractions.handleMapDragStart}
        handleCombinedMouseMove={handleCombinedMouseMove}
        handleCombinedMouseUp={handleCombinedMouseUp}
        handleWheel={handleWheel}
        handleToolAction={handleToolAction}
        mapRef={mapContainerRef}
        zoomLevel={mapInteractions.zoomLevel}
        mapPosition={mapInteractions.mapPosition}
        viewMode={viewMode}
        selectedTool={selectedTool}
      >
        {/* Print preview overlay */}
        <PrintPreviewOverlay viewMode={viewMode} printSettings={printSettings} />
        
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
          lineColor={settings.line.color}
          lineThickness={settings.line.thickness}
        />
        
        {/* Render controls on the map */}
        {controls.map(control => {
          // Determine if this control needs next control info (for start points)
          const nextControl = control.type === 'start' ? findNextControlAfterStart() : null;
          
          return (
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
              nextControl={nextControl}
            />
          );
        })}
      </MapEventHandlers>
      
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
