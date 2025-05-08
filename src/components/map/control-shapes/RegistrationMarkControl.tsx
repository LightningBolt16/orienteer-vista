
import React from 'react';

interface RegistrationMarkControlProps {
  color: string;
  size?: number;
  thickness?: number;
}

// Component specifically for Registration Mark controls
const RegistrationMarkControl: React.FC<RegistrationMarkControlProps> = ({ 
  color = "#f20dff", 
  size = 24, 
  thickness = 2 
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path 
        d="M12,4 L12,20 M4,12 L20,12" 
        stroke={color} 
        strokeWidth={thickness} 
        fill="none" 
      />
    </svg>
  );
};

export default RegistrationMarkControl;
