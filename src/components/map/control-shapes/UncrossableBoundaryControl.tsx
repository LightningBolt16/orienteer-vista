
import React from 'react';

interface UncrossableBoundaryControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Uncrossable Boundary controls
const UncrossableBoundaryControl: React.FC<UncrossableBoundaryControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <line 
        x1="4" 
        y1="12" 
        x2="20" 
        y2="12" 
        stroke={color} 
        strokeWidth={thickness} 
      />
      <circle 
        cx="4" 
        cy="12" 
        r="2" 
        fill={color} 
      />
      <circle 
        cx="20" 
        cy="12" 
        r="2" 
        fill={color} 
      />
    </svg>
  );
};

export default UncrossableBoundaryControl;
