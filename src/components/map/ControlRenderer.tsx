
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';
import { CourseSettings } from '../../hooks/useCourseSettings';

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

  // Using orienteering red color for all controls or settings color if provided
  const CONTROL_COLOR = settings?.controlCircle.color || "#ea384c";
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
              <div className="absolute -top-3 -right-3 bg-white text-red-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
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
              <div className="absolute -top-3 -right-3 bg-white text-red-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
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
      case 'crossing-point':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <circle cx={halfSvgSize} cy={halfSvgSize} r={halfSvgSize - CONTROL_THICKNESS} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <path 
                d={`M${svgSize*0.3},${svgSize*0.3} L${svgSize*0.7},${svgSize*0.7} M${svgSize*0.3},${svgSize*0.7} L${svgSize*0.7},${svgSize*0.3}`} 
                stroke={CONTROL_COLOR} 
                strokeWidth={CONTROL_THICKNESS} 
              />
            </svg>
          </div>
        );
      case 'uncrossable-boundary':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <line x1="2" y1={halfSvgSize} x2={viewBoxSize-2} y2={halfSvgSize} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <circle cx="2" cy={halfSvgSize} r="2" fill={CONTROL_COLOR} />
              <circle cx={viewBoxSize-2} cy={halfSvgSize} r="2" fill={CONTROL_COLOR} />
            </svg>
          </div>
        );
      case 'out-of-bounds':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <rect x="3" y="3" width={viewBoxSize-6} height={viewBoxSize-6} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <line x1="3" y1="3" x2={viewBoxSize-3} y2={viewBoxSize-3} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <line x1="3" y1={viewBoxSize-3} x2={viewBoxSize-3} y2="3" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            </svg>
          </div>
        );
      case 'water-station':
        return (
          <div className="relative">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
              <path d={`M${halfSvgSize},2 L${viewBoxSize-2},${viewBoxSize-2} L2,${viewBoxSize-2} Z`} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
              <circle cx={halfSvgSize} cy={halfSvgSize + (halfSvgSize * 0.2)} r={halfSvgSize * 0.4} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS * 0.75} />
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
