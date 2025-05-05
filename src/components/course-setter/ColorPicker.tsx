
import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-10 h-10 p-0 rounded-md border"
          style={{ background: color }}
        >
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-4">
          <Input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-10 w-full"
          />
          <div className="grid grid-cols-8 gap-1">
            {['#ea384c', '#000000', '#333333', '#666666', '#999999', '#0000FF', '#008000', '#800080'].map(
              (predefinedColor) => (
                <button
                  key={predefinedColor}
                  style={{ backgroundColor: predefinedColor }}
                  className="h-6 w-6 rounded-md border border-gray-300"
                  onClick={() => onColorChange(predefinedColor)}
                />
              )
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
