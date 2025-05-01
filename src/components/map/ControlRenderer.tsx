
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface ControlRendererProps {
  control: Control;
  showControlNumbers: boolean;
  selectedTool: string;
  viewMode: 'edit' | 'preview';
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, controlId: string, control: Control) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>, control: Control) => void;
  printSettings?: PrintSettings;
}

const ControlRenderer: React.FC<ControlRendererProps> = ({
  control,
  showControlNumbers,
  selectedTool,
  viewMode,
  onMouseDown,
  onClick,
  printSettings
}) => {
  // Generate print preview styles for elements out of bounds
  const getPrintPreviewStyles = () => {
    if (!printSettings || viewMode !== 'preview') return {};
    
    // Calculate if we're showing a print preview with potential out-of-bounds elements
    const isPrintable = true; // This would be calculated based on print settings
    
    return {
      filter: isPrintable ? 'none' : 'grayscale(70%) opacity(0.7)',
    };
  };

  // Using orienteering red color for all controls
  const CONTROL_COLOR = "#ea384c";

  // Render special controls based on type with standardized sizes
  const renderControlShape = () => {
    switch (control.type) {
      case 'start':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <polygon 
                points="12,0 24,24 0,24" 
                fill="none" 
                stroke={CONTROL_COLOR} 
                strokeWidth="2"
              />
            </svg>
          </div>
        );
      case 'control':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle 
                cx="12" 
                cy="12" 
                r="10" 
                fill="none" 
                stroke={CONTROL_COLOR} 
                strokeWidth="2" 
              />
            </svg>
            {showControlNumbers && control.number !== undefined && (
              <div className="absolute -top-3 -right-3 bg-white text-red-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {control.number}
              </div>
            )}
          </div>
        );
      case 'finish':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke={CONTROL_COLOR} strokeWidth="2" />
              <circle cx="12" cy="12" r="6" fill="none" stroke={CONTROL_COLOR} strokeWidth="2" />
            </svg>
          </div>
        );
      case 'crossing-point':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke={CONTROL_COLOR} strokeWidth="2" />
              <path d="M8 8L16 16M8 16L16 8" stroke={CONTROL_COLOR} strokeWidth="2" />
            </svg>
          </div>
        );
      case 'uncrossable-boundary':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12" stroke={CONTROL_COLOR} strokeWidth="2" />
              <circle cx="3" cy="12" r="2" fill={CONTROL_COLOR} />
              <circle cx="21" cy="12" r="2" fill={CONTROL_COLOR} />
            </svg>
          </div>
        );
      case 'out-of-bounds':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" fill="none" stroke={CONTROL_COLOR} strokeWidth="2" />
              <line x1="3" y1="3" x2="21" y2="21" stroke={CONTROL_COLOR} strokeWidth="2" />
              <line x1="3" y1="21" x2="21" y2="3" stroke={CONTROL_COLOR} strokeWidth="2" />
            </svg>
          </div>
        );
      case 'water-station':
        return (
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M12 2L4 22H20L12 2Z" fill="none" stroke={CONTROL_COLOR} strokeWidth="2" />
              <circle cx="12" cy="14" r="4" fill="none" stroke={CONTROL_COLOR} strokeWidth="1.5" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      key={control.id}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
        selectedTool === 'pointer' && viewMode === 'edit' ? 'cursor-move' : 'cursor-default'
      }`}
      style={{ 
        left: `${control.x}%`, 
        top: `${control.y}%`,
        ...getPrintPreviewStyles()
      }}
      onMouseDown={(e) => onMouseDown(e, control.id, control)}
      onClick={(e) => onClick(e, control)}
    >
      {renderControlShape()}
    </div>
  );
};

export default ControlRenderer;
