
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader } from '../ui/card';
import { PrintSettings } from '../PrintSettingsDialog';
import { Event, Course, Control as EventControl, MapInfo } from '../../types/event';
import { usePrintSettings } from '../../hooks/usePrintSettings';
import MapEditor from '../MapEditor';
import EditorHeader from './EditorHeader';
import CourseEditor from './CourseEditor';
import ControlProperties from '../ControlProperties';
import LayersPanel from './LayersPanel';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';

// Define a control type compatible with MapEditor
interface Control {
  id: string;
  type: 'start' | 'control' | 'finish';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface EditorLayoutProps {
  currentEvent: Event;
  currentCourse: Course | null;
  selectedControl: EventControl | null;
  allControls: EventControl[];
  sampleMaps: MapInfo[];
  onSelectCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onAddCourse: () => void;
  onAddControl: (control: EventControl) => void;
  onUpdateControlPosition: (id: string, x: number, y: number) => void;
  onSelectControl: (control: EventControl) => void;
  onUpdateControlProperties: (id: string, updates: Partial<EventControl>) => void;
  onDeleteControl: (id: string) => void;
  onExportCourse: () => void;
  onSaveEvent: () => void;
  onBack: () => void;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({
  currentEvent,
  currentCourse,
  selectedControl,
  allControls,
  sampleMaps,
  onSelectCourse,
  onUpdateCourse,
  onAddCourse,
  onAddControl,
  onUpdateControlPosition,
  onSelectControl,
  onUpdateControlProperties,
  onDeleteControl,
  onExportCourse,
  onSaveEvent,
  onBack
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isCourseEditorCollapsed, setIsCourseEditorCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [showControlNumbers, setShowControlNumbers] = useState(true);
  
  const {
    printDialogOpen,
    setPrintDialogOpen,
    currentPrintSettings,
    handleOpenPrintDialog,
    handlePrint
  } = usePrintSettings();
  
  const selectedMap = sampleMaps.find(map => map.id === currentEvent.mapId);
  
  if (!selectedMap) {
    return <div>{t('errorMapNotFound')}</div>;
  }

  // Check if we're viewing the "All Controls" course
  const isAllControlsCourse = currentCourse?.id === 'course-all-controls';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullScreen(false);
        }).catch(err => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  };
  
  // Listen for fullscreen change events
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Helper function to transform EventControl to Control (MapEditor compatible)
  const transformToMapControl = (control: EventControl): Control => {
    // Only keep supported types and convert others to 'control'
    const supportedType = control.type === 'start' || control.type === 'control' || control.type === 'finish'
      ? control.type
      : 'control';
    
    return {
      ...control,
      type: supportedType
    };
  };
  
  return (
    <Card className={`mt-8 h-full overflow-hidden ${isFullScreen ? 'fixed inset-0 z-50 mt-0 rounded-none' : ''}`}>
      <CardHeader className="p-0">
        <EditorHeader
          currentEvent={currentEvent}
          currentCourse={currentCourse}
          viewMode={viewMode}
          printDialogOpen={printDialogOpen}
          showLayerPanel={showLayerPanel}
          onViewModeChange={setViewMode}
          onToggleLayerPanel={() => setShowLayerPanel(!showLayerPanel)}
          onPrintDialogOpenChange={setPrintDialogOpen}
          onExportCourse={onExportCourse}
          onSaveEvent={onSaveEvent}
          onOpenPrintDialog={() => 
            handleOpenPrintDialog(currentCourse?.scale || currentEvent.mapScale)
          }
          onPrint={handlePrint}
          onBack={onBack}
          onToggleFullscreen={toggleFullscreen}
          isFullScreen={isFullScreen}
        />
      </CardHeader>
      
      <div className="flex h-[calc(100%-4rem)]">
        {/* Left sidebar - Courses */}
        <div className="relative h-full">
          {isCourseEditorCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-14 z-10 bg-background shadow-sm"
              onClick={() => setIsCourseEditorCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex h-full">
              <CourseEditor
                currentCourse={currentCourse}
                courses={currentEvent.courses}
                mapType={currentEvent.mapType}
                mapScale={currentEvent.mapScale}
                onSelectCourse={onSelectCourse}
                onUpdateCourse={onUpdateCourse}
                onAddCourse={onAddCourse}
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 self-start mt-2 ml-1"
                onClick={() => setIsCourseEditorCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Main content - Map Editor */}
        <div className="flex-1 h-full overflow-hidden relative">
          {selectedMap && currentCourse && (
            <MapEditor 
              mapUrl={selectedMap.imageUrl}
              controls={currentCourse.controls.map(transformToMapControl)}
              onAddControl={(control: Control) => {
                // Convert the Control type to EventControl type for the hook
                const eventControl: EventControl = {
                  ...control,
                  type: control.type as EventControl['type']
                };
                onAddControl(eventControl);
              }}
              onUpdateControl={isAllControlsCourse ? undefined : onUpdateControlPosition}
              onSelectControl={isAllControlsCourse 
                ? undefined 
                : (control: Control) => {
                    // Convert the Control type to EventControl type for the hook
                    const eventControl: EventControl = {
                      ...control,
                      type: control.type as EventControl['type']
                    };
                    onSelectControl(eventControl);
                  }
              }
              viewMode={isAllControlsCourse ? 'preview' : viewMode}
              allControls={allControls.map(transformToMapControl)}
              snapDistance={2}
              courseScale={currentCourse.scale || currentEvent.mapScale}
              printSettings={currentPrintSettings}
              onOpenPrintDialog={() => 
                handleOpenPrintDialog(currentCourse.scale || currentEvent.mapScale)
              }
              hideDisplayOptions={true}
            />
          )}
        </div>
        
        {/* Right sidebar - Control Properties */}
        {viewMode === 'edit' && selectedControl && !isAllControlsCourse && (
          <div className="w-64 border-l p-4">
            <ControlProperties 
              control={transformToMapControl(selectedControl)}
              onUpdateControl={(updates) => onUpdateControlProperties(selectedControl.id, updates)}
              onDeleteControl={() => onDeleteControl(selectedControl.id)}
            />
          </div>
        )}
        
        {/* Layers panel */}
        {showLayerPanel && (
          <LayersPanel 
            onClose={() => setShowLayerPanel(false)}
            showConnections={showConnections}
            setShowConnections={setShowConnections}
            showControlNumbers={showControlNumbers}
            setShowControlNumbers={setShowControlNumbers}
          />
        )}
      </div>
    </Card>
  );
};

export default EditorLayout;
