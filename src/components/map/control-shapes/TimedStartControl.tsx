
import React from 'react';
import { CourseSettings } from '../../../hooks/useCourseSettings';

interface TimedStartControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Timed Start controls
const TimedStartControl: React.FC<TimedStartControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path 
        d="M6,4 L6,20" 
        stroke={color} 
        strokeWidth={thickness} 
      />
      <path 
        d="M6,4 L18,12 L6,20" 
        fill={color} 
      />
    </svg>
  );
};

export default TimedStartControl;
