
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader } from '../ui/card';
import { PrintSettings } from '../PrintSettingsDialog';
import { Event, Course, Control, MapInfo } from '../../hooks/useEventState';
import { usePrintSettings } from '../../hooks/usePrintSettings';
import MapEditor from '../MapEditor';
import EditorHeader from './EditorHeader';
import CourseEditor from './CourseEditor';
import ControlProperties from '../ControlProperties';
import LayersPanel from './LayersPanel';

interface EditorLayoutProps {
  currentEvent: Event;
  currentCourse: Course | null;
  selectedControl: Control | null;
  allControls: Control[];
  sampleMaps: MapInfo[];
  onSelectCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onAddCourse: () => void;
  onAddControl: (control: Control) => void;
  onUpdateControlPosition: (id: string, x: number, y: number) => void;
  onSelectControl: (control: Control) => void;
  onUpdateControlProperties: (id: string, updates: Partial<Control>) => void;
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
  
  const {
    printDialogOpen,
    setPrintDialogOpen,
    currentPrintSettings,
    handleOpenPrintDialog,
    handlePrint
  } = usePrintSettings();
  
  const selectedMap = sampleMaps.find(map => map.id === currentEvent.mapId);
  
  if (!selectedMap) {
    return <div>{t('error.map.not.found')}</div>;
  }
  
  return (
    <Card className="mt-8 h-full overflow-hidden">
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
        />
      </CardHeader>
      
      <div className="flex h-[calc(100%-4rem)]">
        {/* Left sidebar - Courses */}
        <CourseEditor
          currentCourse={currentCourse}
          courses={currentEvent.courses}
          mapType={currentEvent.mapType}
          mapScale={currentEvent.mapScale}
          onSelectCourse={onSelectCourse}
          onUpdateCourse={onUpdateCourse}
          onAddCourse={onAddCourse}
        />
        
        {/* Main content - Map Editor */}
        <div className="flex-1 h-full overflow-hidden relative">
          {selectedMap && currentCourse && (
            <MapEditor 
              mapUrl={selectedMap.imageUrl}
              controls={currentCourse.controls || []}
              onAddControl={onAddControl}
              onUpdateControl={onUpdateControlPosition}
              onSelectControl={onSelectControl}
              viewMode={viewMode}
              allControls={allControls}
              snapDistance={2}
              courseScale={currentCourse.scale || currentEvent.mapScale}
              printSettings={currentPrintSettings}
              onOpenPrintDialog={() => 
                handleOpenPrintDialog(currentCourse.scale || currentEvent.mapScale)
              }
            />
          )}
        </div>
        
        {/* Right sidebar - Control Properties */}
        {viewMode === 'edit' && selectedControl && (
          <div className="w-64 border-l p-4">
            <ControlProperties 
              control={selectedControl}
              onUpdateControl={(updates) => onUpdateControlProperties(selectedControl.id, updates)}
              onDeleteControl={() => onDeleteControl(selectedControl.id)}
            />
          </div>
        )}
        
        {/* Layers panel */}
        {showLayerPanel && (
          <LayersPanel onClose={() => setShowLayerPanel(false)} />
        )}
      </div>
    </Card>
  );
};

export default EditorLayout;
