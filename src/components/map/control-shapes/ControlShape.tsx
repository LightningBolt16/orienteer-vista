
import React from 'react';
import { CourseSettings } from '../../../hooks/useCourseSettings';
import {
  TimedStartControl,
  MandatoryCrossingControl,
  OptionalCrossingControl,
  OutOfBoundsControl,
  TemporaryConstructionControl,
  WaterLocationControl,
  FirstAidControl,
  ForbiddenRouteControl,
  UncrossableBoundaryControl,
  RegistrationMarkControl,
  StartControl,
  ControlCircle,
  FinishControl
} from './index';

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
  const CONTROL_DIAMETER = settings?.controlCircle.diameter || 24;
  const CONTROL_THICKNESS = settings?.controlCircle.thickness || 2;
  
  const renderNumberBadge = () => {
    if (showControlNumbers && number !== undefined) {
      return (
        <div className="absolute -top-3 -right-3 bg-white text-[#f20dff] rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
          {number}
        </div>
      );
    }
    return null;
  };

  const renderControlByType = () => {
    switch (type) {
      case 'start':
        return <StartControl 
          color={settings?.start.color || CONTROL_COLOR} 
          size={settings?.start.size || CONTROL_DIAMETER} 
          thickness={settings?.start.thickness || CONTROL_THICKNESS} 
        />;
      
      case 'control':
        return <ControlCircle 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'finish':
        return <FinishControl 
          color={settings?.finish.color || CONTROL_COLOR} 
          size={settings?.finish.size || CONTROL_DIAMETER} 
          thickness={settings?.finish.thickness || CONTROL_THICKNESS} 
        />;
      
      case 'timed-start':
        return <TimedStartControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'mandatory-crossing':
        return <MandatoryCrossingControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'optional-crossing':
        return <OptionalCrossingControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'out-of-bounds':
        return <OutOfBoundsControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'temporary-construction':
        return <TemporaryConstructionControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'water-location':
        return <WaterLocationControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'first-aid':
        return <FirstAidControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'forbidden-route':
        return <ForbiddenRouteControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'uncrossable-boundary':
        return <UncrossableBoundaryControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      case 'registration-mark':
        return <RegistrationMarkControl 
          color={CONTROL_COLOR} 
          size={CONTROL_DIAMETER} 
          thickness={CONTROL_THICKNESS} 
        />;
      
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderControlByType()}
      {renderNumberBadge()}
    </div>
  );
};

export default ControlShape;
