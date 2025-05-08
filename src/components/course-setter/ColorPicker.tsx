
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ORIENTEERING_PURPLE } from '../../hooks/useCourseSettings';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange }) => {
  const [localColor, setLocalColor] = useState(color || ORIENTEERING_PURPLE);
  
  // Pre-defined color options
  const colorOptions = [
    '#f20dff', // New default bright pink
    '#ff0000', // Red
    '#00ff00', // Green
    '#0000ff', // Blue
    '#ffff00', // Yellow
    '#00ffff', // Cyan
    '#ff00ff', // Magenta
    '#000000', // Black
  ];

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    onColorChange(newColor);
  };

  const handleColorOptionClick = (clr: string) => {
    setLocalColor(clr);
    onColorChange(clr);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: localColor }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Select Color</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            {colorOptions.map((clr) => (
              <button
                key={clr}
                className={`w-8 h-8 rounded-full ${clr === localColor ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: clr }}
                onClick={() => handleColorOptionClick(clr)}
              />
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={localColor}
              onChange={handleColorChange}
              className="w-8 h-8 p-0 border-0"
            />
            <input
              type="text"
              value={localColor}
              onChange={(e) => {
                const val = e.target.value;
                if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                  setLocalColor(val);
                  if (val.length === 7) { // Only update if it's a valid hex color
                    onColorChange(val);
                  }
                }
              }}
              className="flex-1 px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
