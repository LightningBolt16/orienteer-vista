
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface CourseConnectionsProps {
  sortedControls: Control[];
  showConnections: boolean;
  viewMode: 'edit' | 'preview';
  printSettings?: PrintSettings;
  isAllControlsCourse?: boolean;
}

const CourseConnections: React.FC<CourseConnectionsProps> = ({
  sortedControls,
  showConnections,
  viewMode,
  printSettings,
  isAllControlsCourse = false
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

  if (!showConnections || sortedControls.length <= 1) {
    return null;
  }

  // All controls course uses path smoothing and a different style
  const connectionStyle = isAllControlsCourse
    ? { stroke: "rgba(0, 128, 128, 0.5)", strokeWidth: 1.5, strokeDasharray: "5,5" }
    : { stroke: "rgba(128, 0, 128, 0.7)", strokeWidth: 2, strokeDasharray: "none" };

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {sortedControls.map((control, index) => {
        if (index === 0) return null; // Skip first control for lines
        
        const prevControl = sortedControls[index - 1];
        const isDashed = control.type === 'finish' || isAllControlsCourse;
        
        return (
          <line 
            key={`line-${control.id}`}
            x1={`${prevControl.x}%`}
            y1={`${prevControl.y}%`}
            x2={`${control.x}%`}
            y2={`${control.y}%`}
            stroke={connectionStyle.stroke}
            strokeWidth={connectionStyle.strokeWidth}
            strokeDasharray={isDashed ? "5,5" : "none"}
            style={getPrintPreviewStyles()}
          />
        );
      })}
    </svg>
  );
};

export default CourseConnections;
