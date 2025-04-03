
import React from 'react';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '../ui/tooltip';
import { Button } from '../ui/button';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  className = ''
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className={`h-8 w-8 ${className}`}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ActionButton;
