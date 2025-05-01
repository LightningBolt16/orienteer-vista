
import React from 'react';
import { Button } from '../ui/button';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '../ui/tooltip';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, disabled = false }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={onClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ActionButton;
