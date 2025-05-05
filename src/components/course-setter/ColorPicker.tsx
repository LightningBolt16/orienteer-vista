
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ORIENTEERING_RED } from '../../hooks/useCourseSettings';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange }) => {
  // Common colors for orienteering maps
  const presetColors = [
    ORIENTEERING_RED,  // Orienteering red
    '#1aad19',         // Green
    '#1f78b4',         // Blue
    '#ff7f00',         // Orange
    '#6a3d9a',         // Purple
    '#000000',         // Black
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="w-10 h-10 rounded border border-gray-300 flex items-center justify-center overflow-hidden"
          type="button"
          aria-label="Pick a color"
        >
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: color }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-2">
            {presetColors.map((presetColor) => (
              <button
                key={presetColor}
                className={`w-8 h-8 rounded-full border ${
                  color === presetColor ? 'ring-2 ring-primary' : 'border-gray-300'
                }`}
                style={{ backgroundColor: presetColor }}
                onClick={() => onColorChange(presetColor)}
                type="button"
                aria-label={`Select color: ${presetColor}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <label htmlFor="custom-color" className="text-xs">Custom:</label>
            <input
              id="custom-color"
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-8 w-16 p-0 border-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
