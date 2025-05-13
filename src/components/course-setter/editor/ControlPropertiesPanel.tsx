import React from 'react';
import { Control as EventControl } from '../../../types/event';
import ControlProperties from '../../ControlProperties';

interface ControlPropertiesPanelProps {
  selectedControl: EventControl | null;
  viewMode: 'edit' | 'preview';
  isAllControlsCourse: boolean;
  onUpdateControlProperties: (id: string, updates: Partial<EventControl>) => void;
  onDeleteControl: (id: string) => void;
}

const ControlPropertiesPanel: React.FC<ControlPropertiesPanelProps> = ({
  selectedControl,
  viewMode,
  isAllControlsCourse,
  onUpdateControlProperties,
  onDeleteControl
}) => {
  // Show control properties panel only in edit mode and when a control is selected
  if (viewMode !== 'edit' || !selectedControl || isAllControlsCourse) {
    return null;
  }
  
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
    <div className="w-64 border-l p-4">
      <ControlProperties 
        control={transformToMapControl(selectedControl)}
        onUpdateControl={(updates) => onUpdateControlProperties(selectedControl.id, updates)}
        onDeleteControl={() => onDeleteControl(selectedControl.id)}
      />
    </div>
  );
};

export default ControlPropertiesPanel;
