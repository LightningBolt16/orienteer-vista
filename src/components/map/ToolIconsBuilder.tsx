
import React from 'react';
import { Tool } from '../../hooks/useCourseSettings';
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
} from './control-shapes';

interface ToolIconsBuilderProps {
  toolId: string;
  toolColor: string;
}

const ToolIconsBuilder: React.FC<ToolIconsBuilderProps> = ({ toolId, toolColor }) => {
  const iconSize = 24;
  const strokeWidth = 2;

  switch(toolId) {
    case 'timed-start':
      return <TimedStartControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'mandatory-crossing':
      return <MandatoryCrossingControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'optional-crossing':
      return <OptionalCrossingControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'out-of-bounds':
      return <OutOfBoundsControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'temporary-construction':
      return <TemporaryConstructionControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'water-location':
      return <WaterLocationControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'first-aid':
      return <FirstAidControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'forbidden-route':
      return <ForbiddenRouteControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'uncrossable-boundary':
      return <UncrossableBoundaryControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'registration-mark':
      return <RegistrationMarkControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'start':
      return <StartControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'control':
      return <ControlCircle color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
    case 'finish':
      return <FinishControl color={toolColor} size={iconSize} thickness={strokeWidth} />;
    
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
