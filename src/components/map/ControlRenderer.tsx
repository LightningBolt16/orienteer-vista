
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';
import { CourseSettings } from '../../hooks/useCourseSettings';

interface Control {
  id: string;
  type: string;
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
  settings?: CourseSettings;
}

const ControlRenderer: React.FC<ControlRendererProps> = ({
  control,
  showControlNumbers,
  selectedTool,
  viewMode,
  onMouseDown,
  onClick,
  printSettings,
  settings
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

  // Using pink color for all controls or settings color if provided
  const CONTROL_COLOR = settings?.controlCircle.color || "#f20dff";
  const START_COLOR = settings?.start.color || CONTROL_COLOR;
  const FINISH_COLOR = settings?.finish.color || CONTROL_COLOR;
  
  // Use settings for sizes and thicknesses if provided
  const CONTROL_DIAMETER = settings?.controlCircle.diameter || 24;
  const CONTROL_THICKNESS = settings?.controlCircle.thickness || 2;
  const START_SIZE = settings?.start.size || 24;
  const START_THICKNESS = settings?.start.thickness || 2;
  const FINISH_SIZE = settings?.finish.size || 24;
  const FINISH_THICKNESS = settings?.finish.thickness || 2;

  // Calculate appropriate viewBox and dimensions
  const viewBoxSize = Math.max(CONTROL_DIAMETER, START_SIZE, FINISH_SIZE);
  const svgSize = Math.max(CONTROL_DIAMETER, START_SIZE, FINISH_SIZE);
  const halfSvgSize = svgSize / 2;

  // Render special controls based on type with standardized sizes
  const renderControlShape = () => {
    switch (control.type) {
      case 'start':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <polygon 
                points={`${halfSvgSize},2 ${viewBoxSize-2},${viewBoxSize-2} 2,${viewBoxSize-2}`} 
                fill="none" 
                stroke={START_COLOR} 
                strokeWidth={START_THICKNESS}
              />
            </svg>
            {showControlNumbers && control.number !== undefined && (
              <div className="absolute -top-3 -right-3 bg-white text-[#f20dff] rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {control.number}
              </div>
            )}
          </div>
        );
      case 'control':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <circle 
                cx={halfSvgSize} 
                cy={halfSvgSize} 
                r={halfSvgSize - CONTROL_THICKNESS} 
                fill="none" 
                stroke={CONTROL_COLOR} 
                strokeWidth={CONTROL_THICKNESS} 
              />
            </svg>
            {showControlNumbers && control.number !== undefined && (
              <div className="absolute -top-3 -right-3 bg-white text-[#f20dff] rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {control.number}
              </div>
            )}
          </div>
        );
      case 'finish':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <circle cx={halfSvgSize} cy={halfSvgSize} r={halfSvgSize - FINISH_THICKNESS} fill="none" stroke={FINISH_COLOR} strokeWidth={FINISH_THICKNESS} />
              <circle cx={halfSvgSize} cy={halfSvgSize} r={(halfSvgSize - FINISH_THICKNESS) * 0.6} fill="none" stroke={FINISH_COLOR} strokeWidth={FINISH_THICKNESS} />
            </svg>
          </div>
        );
      case 'timed-start':
        // Flag symbol for timed start - updated icon
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.2},${svgSize*0.8}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.4} L${svgSize*0.2},${svgSize*0.6} Z`} fill={CONTROL_COLOR} />
            </svg>
          </div>
        );
      case 'mandatory-crossing':
        // X symbol for mandatory crossing point - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'optional-crossing':
        // X symbol - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'out-of-bounds':
        // X in square for out of bounds - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <rect x={svgSize*0.2} y={svgSize*0.2} width={svgSize*0.6} height={svgSize*0.6} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'temporary-construction':
        // Square for temporary construction - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <rect x={svgSize*0.2} y={svgSize*0.2} width={svgSize*0.6} height={svgSize*0.6} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'water-location':
        // Cup symbol for water location - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${svgSize*0.3},${svgSize*0.3} 
                       L${svgSize*0.3},${svgSize*0.7} 
                       C${svgSize*0.3},${svgSize*0.8} ${svgSize*0.7},${svgSize*0.8} ${svgSize*0.7},${svgSize*0.7} 
                       L${svgSize*0.7},${svgSize*0.3} Z`} 
                    fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'first-aid':
        // Plus symbol for first aid - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${halfSvgSize},${svgSize*0.2} L${halfSvgSize},${svgSize*0.8} M${svgSize*0.2},${halfSvgSize} L${svgSize*0.8},${halfSvgSize}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'forbidden-route':
        // X symbol for forbidden route - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'uncrossable-boundary':
        // Line with dots for uncrossable boundary - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <line 
                x1={svgSize*0.2} y1={halfSvgSize} 
                x2={svgSize*0.8} y2={halfSvgSize} 
                stroke={CONTROL_COLOR} 
                strokeWidth={CONTROL_THICKNESS} 
              />
              <circle cx={svgSize*0.2} cy={halfSvgSize} r={svgSize*0.1} fill={CONTROL_COLOR} />
              <circle cx={svgSize*0.8} cy={halfSvgSize} r={svgSize*0.1} fill={CONTROL_COLOR} />
            </svg>
          </div>
        );
      case 'registration-mark':
        // Plus symbol for registration mark - matching screenshot
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${halfSvgSize},${svgSize*0.2} L${halfSvgSize},${svgSize*0.8} M${svgSize*0.2},${halfSvgSize} L${svgSize*0.8},${halfSvgSize}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
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
