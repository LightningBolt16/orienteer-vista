
import React from 'react';

interface MandatoryCrossingControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Mandatory Crossing controls
const MandatoryCrossingControl: React.FC<MandatoryCrossingControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path 
        d="M5,5 L19,19 M5,19 L19,5" 
        stroke={color} 
        strokeWidth={thickness} 
        fill="none" 
      />
    </svg>
  );
};

export default MandatoryCrossingControl;
