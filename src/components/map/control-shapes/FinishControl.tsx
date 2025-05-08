
import React from 'react';

interface FinishControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Finish controls
const FinishControl: React.FC<FinishControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth={thickness} />
      <circle cx="12" cy="12" r="6" fill="none" stroke={color} strokeWidth={thickness} />
    </svg>
  );
};

export default FinishControl;
