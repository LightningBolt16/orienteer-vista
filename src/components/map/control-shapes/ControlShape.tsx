
import React from 'react';
import { CourseSettings } from '../../../hooks/useCourseSettings';

interface ControlShapeProps {
  type: string;
  controlColor?: string;
  settings?: CourseSettings;
  showControlNumbers?: boolean;
  number?: number;
}

const ControlShape: React.FC<ControlShapeProps> = ({ 
  type, 
  controlColor = "#f20dff",
  settings,
  showControlNumbers = false,
  number
}) => {
  // Using settings if provided, otherwise default values
  const CONTROL_COLOR = settings?.controlCircle.color || controlColor;
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

  switch (type) {
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
          {showControlNumbers && number !== undefined && (
            <div className="absolute -top-3 -right-3 bg-white text-[#f20dff] rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
              {number}
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
          {showControlNumbers && number !== undefined && (
            <div className="absolute -top-3 -right-3 bg-white text-[#f20dff] rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
              {number}
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
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.2},${svgSize*0.8}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.4} L${svgSize*0.2},${svgSize*0.6} Z`} fill={CONTROL_COLOR} />
          </svg>
        </div>
      );
    case 'mandatory-crossing':
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'optional-crossing':
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'out-of-bounds':
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <rect x={svgSize*0.2} y={svgSize*0.2} width={svgSize*0.6} height={svgSize*0.6} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'temporary-construction':
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <rect x={svgSize*0.2} y={svgSize*0.2} width={svgSize*0.6} height={svgSize*0.6} fill="none" stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'water-location':
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
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <path d={`M${halfSvgSize},${svgSize*0.2} L${halfSvgSize},${svgSize*0.8} M${svgSize*0.2},${halfSvgSize} L${svgSize*0.8},${halfSvgSize}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'forbidden-route':
      return (
        <div className="relative">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <path d={`M${svgSize*0.2},${svgSize*0.2} L${svgSize*0.8},${svgSize*0.8} M${svgSize*0.2},${svgSize*0.8} L${svgSize*0.8},${svgSize*0.2}`} stroke={CONTROL_COLOR} strokeWidth={CONTROL_THICKNESS} />
          </svg>
        </div>
      );
    case 'uncrossable-boundary':
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

export default ControlShape;
