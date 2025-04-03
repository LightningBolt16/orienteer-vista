
import React, { useState } from 'react';
import { 
  MousePointer, Move, ZoomIn, ZoomOut, 
  ChevronDown, ChevronUp, LineChart, Circle, Flag, 
  XCircle, TriangleAlert, Fence, Map
} from 'lucide-react';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from './ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Button } from './ui/button';
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from './ui/collapsible';
import { useLanguage } from '../context/LanguageContext';

export type CourseTool = 
  'pointer' | 'move' | 'start' | 'control' | 'finish' | 'zoom-in' | 'zoom-out' | 
  'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station' | 'advanced';

interface CourseToolsProps {
  selectedTool: CourseTool;
  onToolChange: (tool: CourseTool) => void;
  onResetView: () => void;
}

const CourseTools: React.FC<CourseToolsProps> = ({ 
  selectedTool,
  onToolChange,
  onResetView
}) => {
  const { t } = useLanguage();
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  
  // Basic tools that are always shown
  const basicTools = [
    { id: 'pointer', icon: <MousePointer size={18} />, label: t('pointer.tool'), shortcut: 'P' },
    { id: 'move', icon: <Move size={18} />, label: t('move.map'), shortcut: 'M' },
    { id: 'control', icon: <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-purple-600"></div>, label: t('add.control'), shortcut: 'C' },
    { id: 'start', icon: <div className="flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 28 28">
        <polygon points="14,0 28,28 0,28" fill="none" stroke="#D946EF" strokeWidth="2" />
      </svg>
    </div>, label: t('add.start'), shortcut: 'S' },
    { id: 'finish', icon: <div className="flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
        <circle cx="14" cy="14" r="8" fill="none" stroke="#ef4444" strokeWidth="2" />
      </svg>
    </div>, label: t('add.finish'), shortcut: 'F' }
  ];
  
  // Advanced tools
  const advancedTools = [
    { id: 'crossing-point', icon: <XCircle size={18} />, label: t('crossing.point') },
    { id: 'uncrossable-boundary', icon: <Fence size={18} />, label: t('uncrossable.boundary') },
    { id: 'out-of-bounds', icon: <LineChart size={18} />, label: t('out.of.bounds') },
    { id: 'water-station', icon: <TriangleAlert size={18} />, label: t('water.station') }
  ];
  
  // Zoom tools are separate
  const zoomTools = [
    { id: 'zoom-in', icon: <ZoomIn size={18} />, label: t('zoom.in'), shortcut: '+' },
    { id: 'zoom-out', icon: <ZoomOut size={18} />, label: t('zoom.out'), shortcut: '-' }
  ];
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex flex-col gap-2">
      {/* Basic Tools */}
      <ToggleGroup 
        type="single" 
        value={selectedTool} 
        onValueChange={(value: CourseTool) => value && onToolChange(value)}
        className="flex flex-col gap-1"
      >
        {basicTools.map(tool => (
          <TooltipProvider key={tool.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value={tool.id} 
                  aria-label={tool.label}
                  className="p-2 h-8 w-8 flex items-center justify-center"
                >
                  {tool.icon}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tool.label} {tool.shortcut && `(${tool.shortcut})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        <div className="h-px bg-gray-200 my-1"></div>
        
        {/* Zoom Tools */}
        {zoomTools.map(tool => (
          <TooltipProvider key={tool.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem 
                  value={tool.id} 
                  aria-label={tool.label}
                  className="p-2 h-8 w-8 flex items-center justify-center"
                >
                  {tool.icon}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tool.label} {tool.shortcut && `(${tool.shortcut})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </ToggleGroup>
      
      {/* Reset View Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="text-xs h-8 w-full"
        onClick={onResetView}
      >
        <Map className="h-3 w-3 mr-1" />
        {t('reset.view')}
      </Button>
      
      {/* Advanced Tools Section */}
      <Collapsible open={showAdvancedTools} onOpenChange={setShowAdvancedTools}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full flex items-center justify-between text-xs h-6"
          >
            {t('advanced.tools')}
            {showAdvancedTools 
              ? <ChevronUp className="h-4 w-4 ml-1" /> 
              : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1">
          <ToggleGroup 
            type="single" 
            value={selectedTool} 
            onValueChange={(value: CourseTool) => value && onToolChange(value)}
            className="flex flex-col gap-1"
          >
            {advancedTools.map(tool => (
              <TooltipProvider key={tool.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem 
                      value={tool.id} 
                      aria-label={tool.label}
                      className="p-2 h-8 w-8 flex items-center justify-center"
                    >
                      {tool.icon}
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tool.label}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </ToggleGroup>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default CourseTools;
