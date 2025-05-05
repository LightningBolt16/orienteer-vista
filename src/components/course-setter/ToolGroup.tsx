
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CourseTool } from '../CourseTools';

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

interface ToolGroupProps {
  tools: Tool[];
  selectedTool: string;
  onValueChange: (value: CourseTool) => void;
  disabled?: boolean;
}

const ToolGroup: React.FC<ToolGroupProps> = ({
  tools,
  selectedTool,
  onValueChange,
  disabled = false
}) => {
  return (
    <ToggleGroup 
      type="single"
      value={selectedTool}
      onValueChange={(value) => {
        if (!disabled && value) onValueChange(value as CourseTool);
      }}
      className="flex flex-wrap gap-1"
    >
      {tools.map((tool) => (
        <Tooltip key={tool.id} delayDuration={300}>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value={tool.id} 
              size="sm"
              disabled={disabled}
              className={`flex items-center justify-center h-8 w-8 text-sm ${
                selectedTool === tool.id ? 'bg-primary/20' : ''
              }`}
            >
              {tool.icon}
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-center">
            <p>{tool.label}</p>
            {tool.shortcut && (
              <p className="text-xs text-muted-foreground">
                {tool.shortcut}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
};

export default ToolGroup;
