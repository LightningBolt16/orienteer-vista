
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
  
  // Define triangle points for an equilateral triangle
  // The triangle should point upward by default (before rotation)
  const points = `${centerX},${size * 0.2} ${size * 0.2},${size * 0.8} ${size * 0.8},${size * 0.8}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(${rotationAngle} ${centerX} ${centerY})`}>
        <polygon 
          points={points}
          fill="none" 
          stroke={color} 
          strokeWidth={thickness} 
        />
      </g>
    </svg>
  );
};

export default StartControl;
