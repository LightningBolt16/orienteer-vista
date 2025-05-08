
import React from 'react';

interface WaterLocationControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Water Location controls
const WaterLocationControl: React.FC<WaterLocationControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path 
        d="M8,5 L8,19 C8,21 16,21 16,19 L16,5 L8,5 Z" 
        fill="none" 
        stroke={color} 
        strokeWidth={thickness} 
      />
    </svg>
  );
};

export default WaterLocationControl;
