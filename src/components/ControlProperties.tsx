
import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Trash2 } from 'lucide-react';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface ControlPropertiesProps {
  control: Control;
  onUpdateControl: (updates: Partial<Control>) => void;
  onDeleteControl: () => void;
}

const ControlProperties: React.FC<ControlPropertiesProps> = ({
  control,
  onUpdateControl,
  onDeleteControl
}) => {
  const typeLabels = {
    start: 'Start Point',
    control: 'Control Point',
    finish: 'Finish Point'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {typeLabels[control.type]}
          {control.number && ` #${control.number}`}
        </h3>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={onDeleteControl}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        {control.type === 'control' && (
          <div className="space-y-2">
            <Label htmlFor="control-number">Control Number</Label>
            <Input
              id="control-number"
              type="number"
              value={control.number || ''}
              onChange={(e) => onUpdateControl({ number: parseInt(e.target.value) || undefined })}
            />
          </div>
        )}
        
        {control.type === 'control' && (
          <div className="space-y-2">
            <Label htmlFor="control-code">Control Code</Label>
            <Input
              id="control-code"
              value={control.code || ''}
              onChange={(e) => onUpdateControl({ code: e.target.value })}
              placeholder="Control code"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="control-description">Description</Label>
          <Input
            id="control-description"
            value={control.description || ''}
            onChange={(e) => onUpdateControl({ description: e.target.value })}
            placeholder="Description"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="control-x">X Position (%)</Label>
            <Input
              id="control-x"
              type="number"
              step="0.1"
              value={control.x.toFixed(2)}
              onChange={(e) => onUpdateControl({ x: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="control-y">Y Position (%)</Label>
            <Input
              id="control-y"
              type="number"
              step="0.1"
              value={control.y.toFixed(2)}
              onChange={(e) => onUpdateControl({ y: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlProperties;
