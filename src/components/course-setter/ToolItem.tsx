
import React from 'react';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '../ui/tooltip';
import { ToggleGroupItem } from '../ui/toggle-group';

interface ToolItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isSelected?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({ 
  id, 
  icon, 
  label, 
  shortcut,
  isSelected
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem 
            value={id} 
            aria-label={label}
            className={`p-2 h-8 w-8 flex items-center justify-center ${isSelected ? 'bg-primary/10' : ''}`}
          >
            {icon}
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {label} {shortcut && `(${shortcut})`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ToolItem;
