
import React from 'react';

interface TemporaryConstructionControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Temporary Construction controls
const TemporaryConstructionControl: React.FC<TemporaryConstructionControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect 
        x="5" 
        y="5" 
        width="14" 
        height="14" 
        stroke={color} 
        strokeWidth={thickness} 
        fill="none" 
      />
    </svg>
  );
};

export default TemporaryConstructionControl;
