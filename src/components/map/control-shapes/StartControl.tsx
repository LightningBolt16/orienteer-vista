
import React from 'react';

interface StartControlProps {
  color: string;
  size?: number;
  thickness?: number;
  rotationAngle?: number; // Added rotation angle prop
}

// Component specifically for Start controls
const StartControl: React.FC<StartControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2,
  rotationAngle = 0 // Default to 0 degrees (pointing right)
}) => {
  // Calculate center point
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <g transform={`rotate(${rotationAngle} ${centerX} ${centerY})`}>
        <polygon 
          points="12,2 22,22 2,22" 
          fill="none" 
          stroke={color} 
          strokeWidth={thickness} 
        />
      </g>
    </svg>
  );
};

export default StartControl;
