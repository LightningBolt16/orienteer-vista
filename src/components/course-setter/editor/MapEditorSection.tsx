import React from 'react';
import { Event, Course, Control as EventControl, MapInfo } from '../../../types/event';
import MapEditor from '../../MapEditor';
import { Button } from '../../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MapEditorSectionProps {
  selectedMap: MapInfo;
  currentCourse: Course;
  allControls: EventControl[];
  selectedControl: EventControl | null;
  viewMode: 'edit' | 'preview';
  isAllControlsCourse: boolean;
  isCourseEditorCollapsed: boolean;
  onAddControl: (control: any) => void;
  onUpdateControlPosition: (id: string, x: number, y: number) => void;
  onSelectControl: (control: EventControl) => void;
  currentPrintSettings: any;
  handleOpenPrintDialog: (scale: string) => void;
  onToggleCourseEditorCollapsed: () => void;
}

const MapEditorSection: React.FC<MapEditorSectionProps> = ({
  selectedMap,
  currentCourse,
  allControls,
  selectedControl,
  viewMode,
  isAllControlsCourse,
  isCourseEditorCollapsed,
  onAddControl,
  onUpdateControlPosition,
  onSelectControl,
  currentPrintSettings,
  handleOpenPrintDialog,
  onToggleCourseEditorCollapsed
}) => {
  // Helper function to transform EventControl to Control (MapEditor compatible)
  const transformToMapControl = (control: EventControl): any => {
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
    <div className="flex-1 h-full overflow-hidden relative">
      {isCourseEditorCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-14 z-10 bg-background shadow-sm"
          onClick={onToggleCourseEditorCollapsed}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      {selectedMap && currentCourse && (
        <MapEditor 
          mapUrl={selectedMap.imageUrl}
          controls={currentCourse.controls.map(transformToMapControl)}
          onAddControl={(control: any) => {
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
            : (control: any) => {
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
          courseScale={currentCourse.scale || '10000'}
          printSettings={currentPrintSettings}
          onOpenPrintDialog={() => 
            handleOpenPrintDialog(currentCourse.scale || '10000')
          }
          hideDisplayOptions={true}
        />
      )}
    </div>
  );
};

export default MapEditorSection;
