
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';
import { CourseSettings } from '../../hooks/useCourseSettings';
import ControlShape from './control-shapes/ControlShape';

interface Control {
  id: string;
  type: string;
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface ControlRendererProps {
  control: Control;
  showControlNumbers: boolean;
  selectedTool: string;
  viewMode: 'edit' | 'preview';
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, controlId: string, control: Control) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>, control: Control) => void;
  printSettings?: PrintSettings;
  settings?: CourseSettings;
  nextControl?: Control | null; // Add prop for next control to calculate rotation
}

const ControlRenderer: React.FC<ControlRendererProps> = ({
  control,
  showControlNumbers,
  selectedTool,
  viewMode,
  onMouseDown,
  onClick,
  printSettings,
  settings,
  nextControl
}) => {
  // Generate print preview styles for elements out of bounds
  const getPrintPreviewStyles = () => {
    if (!printSettings || viewMode !== 'preview') return {};
    
    // Calculate if we're showing a print preview with potential out-of-bounds elements
    const isPrintable = true; // This would be calculated based on print settings
    
    return {
      filter: isPrintable ? 'none' : 'grayscale(70%) opacity(0.7)',
    };
  };

  // Calculate rotation angle for start control
  const calculateRotationAngle = () => {
    if (control.type === 'start' && nextControl) {
      const dx = nextControl.x - control.x;
      const dy = nextControl.y - control.y;
      // Calculate angle in degrees
      const angleDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
      return angleDegrees;
    }
    return 0;
  };

  // Check if this control is draggable (some special controls may not be)
  const isDraggable = viewMode === 'edit' && selectedTool === 'pointer';
  
  return (
    <div 
      key={control.id}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
        isDraggable ? 'cursor-move' : 'cursor-default'
      }`}
      style={{ 
        left: `${control.x}%`, 
        top: `${control.y}%`,
        ...getPrintPreviewStyles()
      }}
      onMouseDown={(e) => onMouseDown(e, control.id, control)}
      onClick={(e) => onClick(e, control)}
    >
      <ControlShape 
        type={control.type}
        settings={settings}
        showControlNumbers={showControlNumbers}
        number={control.number}
        rotationAngle={calculateRotationAngle()}
      />
    </div>
  );
};

export default ControlRenderer;
