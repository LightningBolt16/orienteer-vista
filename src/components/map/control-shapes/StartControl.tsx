
import React from 'react';

interface StartControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Start controls
const StartControl: React.FC<StartControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon 
        points="12,2 22,22 2,22" 
        fill="none" 
        stroke={color} 
        strokeWidth={thickness} 
      />
    </svg>
  );
};

export default StartControl;
