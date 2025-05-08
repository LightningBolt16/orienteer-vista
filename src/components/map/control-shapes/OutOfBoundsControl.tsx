
import React from 'react';

interface OutOfBoundsControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Out Of Bounds controls
const OutOfBoundsControl: React.FC<OutOfBoundsControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect 
        x="4" 
        y="4" 
        width="16" 
        height="16" 
        stroke={color} 
        strokeWidth={thickness} 
        fill="none" 
      />
      <path 
        d="M7,7 L17,17 M7,17 L17,7" 
        stroke={color} 
        strokeWidth={thickness} 
      />
    </svg>
  );
};

export default OutOfBoundsControl;
