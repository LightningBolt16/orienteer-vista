
import React from 'react';

interface ToolIconProps {
  toolId: string;
  color: string;
}

const ToolIcon: React.FC<ToolIconProps> = ({ toolId, color }) => {
  switch (toolId) {
    case 'timed-start':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M4,4 L4,20" stroke={color} strokeWidth="2" />
          <path d="M4,4 L20,12 L4,20" fill={color} />
        </svg>
      );
    case 'mandatory-crossing':
    case 'optional-crossing':
    case 'forbidden-route':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M6,6 L18,18 M6,18 L18,6" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'out-of-bounds':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" fill="none" stroke={color} strokeWidth="2" />
          <path d="M8,8 L16,16 M8,16 L16,8" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'temporary-construction':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'water-location':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M8,6 L8,18 C8,20 16,20 16,18 L16,6 L8,6 Z" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'first-aid':
    case 'registration-mark':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M12,4 L12,20 M4,12 L20,12" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'uncrossable-boundary':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2" />
          <circle cx="4" cy="12" r="2" fill={color} />
          <circle cx="20" cy="12" r="2" fill={color} />
        </svg>
      );
    default:
      return null;
  }
};

export default ToolIcon;
