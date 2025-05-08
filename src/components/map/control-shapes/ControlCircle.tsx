
import React from 'react';

interface ControlCircleProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for regular Control circles
const ControlCircle: React.FC<ControlCircleProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        fill="none" 
        stroke={color} 
        strokeWidth={thickness} 
      />
    </svg>
  );
};

export default ControlCircle;
