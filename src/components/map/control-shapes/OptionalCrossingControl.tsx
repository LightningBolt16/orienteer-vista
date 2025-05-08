
import React from 'react';

interface OptionalCrossingControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Optional Crossing controls
const OptionalCrossingControl: React.FC<OptionalCrossingControlProps> = ({ 
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

export default OptionalCrossingControl;
