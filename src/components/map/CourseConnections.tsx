
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
  lineColor = "#9b87f5",
  lineThickness = 0.5
}) => {
  if (!showConnections || sortedControls.length < 2) return null;
  
  // Calculate edge points for line connections
  const getEdgePoints = (start: Control, end: Control) => {
    // Determine control radius based on type (in percentage of map dimensions)
    const getControlRadius = (control: Control): number => {
      // Default radius is 0.3% of map dimensions
      const defaultRadius = 0.3;
      
      // Adjust radius based on control type
      if (control.type === 'start' || control.type === 'finish') {
        return defaultRadius * 1.2; // Slightly larger for start/finish
      }
      return defaultRadius;
    };
    
    const startRadius = getControlRadius(start);
    const endRadius = getControlRadius(end);
    
    // Calculate angle between points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate edge points
    const startX = start.x + Math.cos(angle) * startRadius;
    const startY = start.y + Math.sin(angle) * startRadius;
    const endX = end.x - Math.cos(angle) * endRadius;
    const endY = end.y - Math.sin(angle) * endRadius;
    
    return { startX, startY, endX, endY };
  };

  // Generate line segments between controls - only connect standard controls and timed start
  const lines = [];
  
  // Filter to only include standard control types before drawing lines
  const standardControls = sortedControls.filter(
    c => c.type === 'control' || c.type === 'start' || c.type === 'finish' || c.type === 'timed-start' || 
         c.type === 'mandatory-crossing'
  );
  
  for (let i = 0; i < standardControls.length - 1; i++) {
    const start = standardControls[i];
    const end = standardControls[i + 1];
    
    // Skip finish to start connections
    if (start.type === 'finish') continue;
    
    // Only connect timed-start to start
    if (start.type === 'timed-start' && end.type !== 'start') continue;
    
    // Mandatory crossing points should connect with the controls before and after
    if ((start.type === 'mandatory-crossing' || end.type === 'mandatory-crossing') ||
        (start.type !== 'timed-start' && end.type !== 'timed-start') || 
        (start.type === 'timed-start' && end.type === 'start')) {
      const key = `line-${start.id}-${end.id}`;
      
      // Get edge points instead of center points
      const { startX, startY, endX, endY } = getEdgePoints(start, end);
      
      lines.push(
        <line
          key={key}
          x1={`${startX}%`}
          y1={`${startY}%`}
          x2={`${endX}%`}
          y2={`${endY}%`}
          stroke={lineColor}
          strokeWidth={lineThickness}
        />
      );
    }
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
