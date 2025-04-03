
import React, { useState } from 'react';
import { 
  MousePointer, Move, ZoomIn, ZoomOut, 
  ChevronDown, ChevronUp, LineChart, Circle, Flag, 
  XCircle, TriangleAlert, Fence, Map, Printer
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
import { 
  Menubar, 
  MenubarMenu, 
  MenubarContent, 
  MenubarItem, 
  MenubarTrigger 
} from './ui/menubar';

export type CourseTool = 
  'pointer' | 'move' | 'start' | 'control' | 'finish' | 'zoom-in' | 'zoom-out' | 
  'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station' | 'advanced';

interface CourseToolsProps {
  selectedTool: CourseTool;
  onToolChange: (tool: CourseTool) => void;
  onResetView: () => void;
  onPrint: () => void;
}

const CourseTools: React.FC<CourseToolsProps> = ({ 
  selectedTool,
  onToolChange,
  onResetView,
  onPrint
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
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex gap-2 items-center w-full">
      {/* Basic Tools */}
      <ToggleGroup 
        type="single" 
        value={selectedTool} 
        onValueChange={(value: CourseTool) => value && onToolChange(value)}
        className="flex gap-1"
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
              <TooltipContent side="bottom">
                {tool.label} {tool.shortcut && `(${tool.shortcut})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </ToggleGroup>
      
      <div className="w-px h-8 bg-gray-200"></div>
      
      {/* Zoom Tools */}
      <ToggleGroup 
        type="single" 
        value={selectedTool} 
        onValueChange={(value: CourseTool) => value && onToolChange(value)}
        className="flex gap-1"
      >
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
              <TooltipContent side="bottom">
                {tool.label} {tool.shortcut && `(${tool.shortcut})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </ToggleGroup>
      
      {/* Advanced Tools Dropdown */}
      <Collapsible>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center text-xs h-8 px-2"
            >
              {t('advanced.tools')}
              {showAdvancedTools 
                ? <ChevronUp className="h-4 w-4 ml-1" /> 
                : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="absolute top-full mt-1 left-0 bg-white shadow-md rounded-md p-2 z-10">
            <ToggleGroup 
              type="single" 
              value={selectedTool} 
              onValueChange={(value: CourseTool) => value && onToolChange(value)}
              className="flex gap-1"
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
                    <TooltipContent side="bottom">
                      {tool.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </ToggleGroup>
          </CollapsibleContent>
        </div>
      </Collapsible>
      
      <div className="w-px h-8 bg-gray-200"></div>
      
      {/* Reset View and Print Buttons */}
      <div className="flex gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={onResetView}
              >
                <Map className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('reset.view')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={onPrint}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('print')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Display options could be moved to a dropdown menu if needed */}
    </div>
  );
};

export default CourseTools;
