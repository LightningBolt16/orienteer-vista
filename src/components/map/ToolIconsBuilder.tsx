
import React from 'react';
import { Tool } from '../../hooks/useCourseSettings';

interface ToolIconsBuilderProps {
  toolId: string;
  toolColor: string;
}

const ToolIconsBuilder: React.FC<ToolIconsBuilderProps> = ({ toolId, toolColor }) => {
  switch(toolId) {
    case 'timed-start':
      // Flag symbol for timed start
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M4,4 L4,20" stroke={toolColor} strokeWidth="2" />
            <path d="M4,4 L20,12 L4,20" fill={toolColor} />
          </svg>
        </div>
      );
    case 'mandatory-crossing':
      // X symbol for mandatory crossing 
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M6,6 L18,18 M6,18 L18,6" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'optional-crossing':
      // X symbol inside circle for optional crossing point
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M6,6 L18,18 M6,18 L18,6" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'out-of-bounds':
      // X in square for out of bounds
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" fill="none" stroke={toolColor} strokeWidth="2" />
            <path d="M8,8 L16,16 M8,16 L16,8" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'temporary-construction':
      // Square for temporary construction
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" fill="none" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'water-location':
      // Cup symbol for water location
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M8,6 L8,18 C8,20 16,20 16,18 L16,6 L8,6 Z" fill="none" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'first-aid':
      // Plus symbol for first aid
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12,4 L12,20 M4,12 L20,12" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'forbidden-route':
      // X for forbidden route
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M6,6 L18,18 M6,18 L18,6" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    case 'uncrossable-boundary':
      // Line with dots for uncrossable boundary
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <line x1="4" y1="12" x2="20" y2="12" stroke={toolColor} strokeWidth="2" />
            <circle cx="4" cy="12" r="2" fill={toolColor} />
            <circle cx="20" cy="12" r="2" fill={toolColor} />
          </svg>
        </div>
      );
    case 'registration-mark':
      // Plus symbol for registration mark
      return (
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12,4 L12,20 M4,12 L20,12" stroke={toolColor} strokeWidth="2" />
          </svg>
        </div>
      );
    default:
      return null;
  }
};

export const buildToolIcons = (tools: Tool[], color: string) => {
  return tools.map(tool => ({
    ...tool,
    icon: <ToolIconsBuilder toolId={tool.id} toolColor={color} />,
    label: typeof tool.label === 'string' ? tool.label : tool.id
  }));
};

export default ToolIconsBuilder;
