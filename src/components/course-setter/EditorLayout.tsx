
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader } from '../ui/card';
import { PrintSettings } from '../PrintSettingsDialog';
import { Event, Course, Control as EventControl, MapInfo } from '../../types/event';
import { usePrintSettings } from '../../hooks/usePrintSettings';
import EditorHeader from './EditorHeader';
import LayersPanel from './LayersPanel';
import CourseEditorPanel from './editor/CourseEditorPanel';
import MapEditorSection from './editor/MapEditorSection';
import ControlPropertiesPanel from './editor/ControlPropertiesPanel';

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
          <CourseEditorPanel 
            currentCourse={currentCourse}
            courses={currentEvent.courses}
            mapType={currentEvent.mapType}
            mapScale={currentEvent.mapScale}
            isCourseEditorCollapsed={isCourseEditorCollapsed}
            onSelectCourse={onSelectCourse}
            onUpdateCourse={onUpdateCourse}
            onAddCourse={onAddCourse}
            onToggleCourseEditorCollapsed={() => setIsCourseEditorCollapsed(false)}
          />
        </div>
        
        {/* Main content - Map Editor */}
        <MapEditorSection 
          selectedMap={selectedMap}
          currentCourse={currentCourse!}
          allControls={allControls}
          selectedControl={selectedControl}
          viewMode={viewMode}
          isAllControlsCourse={isAllControlsCourse}
          isCourseEditorCollapsed={isCourseEditorCollapsed}
          onAddControl={onAddControl}
          onUpdateControlPosition={onUpdateControlPosition}
          onSelectControl={onSelectControl}
          currentPrintSettings={currentPrintSettings}
          handleOpenPrintDialog={handleOpenPrintDialog}
          onToggleCourseEditorCollapsed={() => setIsCourseEditorCollapsed(false)}
        />
        
        {/* Right sidebar - Control Properties */}
        <ControlPropertiesPanel 
          selectedControl={selectedControl}
          viewMode={viewMode}
          isAllControlsCourse={isAllControlsCourse}
          onUpdateControlProperties={onUpdateControlProperties}
          onDeleteControl={onDeleteControl}
        />
        
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
