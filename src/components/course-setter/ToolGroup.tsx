
import React from 'react';
import { ToggleGroup } from '../ui/toggle-group';
import ToolItem from './ToolItem';
import { CourseTool } from '../CourseTools';

interface ToolDefinition {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

interface ToolGroupProps {
  tools: ToolDefinition[];
  selectedTool: CourseTool;
  onValueChange: (value: CourseTool) => void;
  className?: string;
}

const ToolGroup: React.FC<ToolGroupProps> = ({
  tools,
  selectedTool,
  onValueChange,
  className = ''
}) => {
  return (
    <ToggleGroup 
      type="single" 
      value={selectedTool} 
      onValueChange={(value: CourseTool) => value && onValueChange(value)}
      className={`flex gap-1 ${className}`}
    >
      {tools.map(tool => (
        <ToolItem
          key={tool.id}
          id={tool.id}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          isSelected={selectedTool === tool.id}
        />
      ))}
    </ToggleGroup>
  );
};

export default ToolGroup;
