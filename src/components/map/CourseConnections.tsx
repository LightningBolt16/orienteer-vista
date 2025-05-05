
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';

interface Control {
  id: string;
  type: string;
  x: number;
  y: number;
  number?: number;
  code?: string;
}

interface CourseConnectionsProps {
  sortedControls: Control[];
  showConnections: boolean;
  viewMode: 'edit' | 'preview';
  printSettings?: PrintSettings;
  lineColor?: string;
  lineThickness?: number;
}

const CourseConnections: React.FC<CourseConnectionsProps> = ({ 
  sortedControls, 
  showConnections, 
  viewMode, 
  printSettings,
  lineColor = "#ea384c",
  lineThickness = 1
}) => {
  if (!showConnections || sortedControls.length < 2) return null;
  
  // Generate line segments between controls - only standard controls
  const lines = [];
  
  // Filter to only include standard control types before drawing lines
  const standardControls = sortedControls.filter(
    c => c.type === 'control' || c.type === 'start' || c.type === 'finish'
  );
  
  for (let i = 0; i < standardControls.length - 1; i++) {
    const start = standardControls[i];
    const end = standardControls[i + 1];
    
    // Skip finish to start connections
    if (start.type === 'finish' || end.type === 'start') continue;
    
    const key = `line-${start.id}-${end.id}`;
    
    lines.push(
      <line
        key={key}
        x1={`${start.x}%`}
        y1={`${start.y}%`}
        x2={`${end.x}%`}
        y2={`${end.y}%`}
        stroke={lineColor}
        strokeWidth={lineThickness}
      />
    );
  }
  
  // Calculate the bounds for the SVG viewBox
  const minX = Math.min(...sortedControls.map(c => c.x)) - 5;
  const maxX = Math.max(...sortedControls.map(c => c.x)) + 5;
  const minY = Math.min(...sortedControls.map(c => c.y)) - 5;
  const maxY = Math.max(...sortedControls.map(c => c.y)) + 5;
  
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ filter: 'none' }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {lines}
    </svg>
  );
};

export default CourseConnections;
