
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ORIENTEERING_PURPLE } from '../../hooks/useCourseSettings';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange }) => {
  const [localColor, setLocalColor] = useState(color || ORIENTEERING_PURPLE);

  const predefinedColors = [
    "#f20dff", // Bright pink (default)
    "#ff0000", // Red
    "#0000ff", // Blue
    "#00ff00", // Green
    "#ff00ff", // Magenta
    "#ffff00", // Yellow
    "#00ffff", // Cyan
    "#ff8c00", // Dark Orange
    "#800080", // Purple
    "#000000", // Black
  ];

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    onColorChange(newColor);
  };

  const handlePredefinedColorClick = (newColor: string) => {
    setLocalColor(newColor);
    onColorChange(newColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-8 h-8 rounded-md border border-gray-300 shadow-sm"
          style={{ backgroundColor: localColor }}
          aria-label="Pick a color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Pick a color</span>
            <span className="text-xs text-muted-foreground">{localColor}</span>
          </div>

          <input
            type="color"
            value={localColor}
            onChange={handleColorChange}
            className="w-full h-8 cursor-pointer"
          />

          <div className="grid grid-cols-5 gap-2 mt-3">
            {predefinedColors.map((predefinedColor) => (
              <button
                key={predefinedColor}
                className={`w-8 h-8 rounded-md ${
                  predefinedColor === localColor ? 'ring-2 ring-primary ring-offset-2' : 'border border-gray-300'
                }`}
                style={{ backgroundColor: predefinedColor }}
                onClick={() => handlePredefinedColorClick(predefinedColor)}
                aria-label={`Select color ${predefinedColor}`}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;
