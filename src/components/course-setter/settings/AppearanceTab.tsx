
import React from 'react';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { ColorPicker } from '../ColorPicker';
import { CourseSettings } from '../../../hooks/useCourseSettings';

interface AppearanceTabProps {
  localSettings: CourseSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<CourseSettings>>;
  originalSettings: CourseSettings;
}

const AppearanceTab: React.FC<AppearanceTabProps> = ({ 
  localSettings, 
  setLocalSettings, 
  originalSettings 
}) => {
  // Function to update color for all elements
  const updateAllColors = (color: string) => {
    setLocalSettings(prev => ({
      ...prev,
      controlCircle: { ...prev.controlCircle, color },
      start: { ...prev.start, color },
      finish: { ...prev.finish, color },
      line: { ...prev.line, color }
    }));
  };

  return (
    <div className="space-y-6 border p-4 rounded-md">
      <div className="space-y-2">
        <Label className="text-lg font-medium">Element Color</Label>
        <p className="text-sm text-muted-foreground">
          Choose a color for all course elements
        </p>
        
        <div className="flex items-center gap-4 mt-2">
          <ColorPicker 
            color={localSettings.controlCircle.color} 
            onColorChange={updateAllColors}
          />
          <span className="text-sm">{localSettings.controlCircle.color}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-lg font-medium">Line Thickness</Label>
        <div className="flex items-center gap-2">
          <Slider
            min={0.2}
            max={2}
            step={0.1}
            value={[localSettings.line.thickness]}
            onValueChange={(value) => setLocalSettings(prev => ({
              ...prev,
              line: {
                ...prev.line,
                thickness: value[0]
              }
            }))}
            className="flex-1"
          />
          <span className="text-sm w-8 text-right">{localSettings.line.thickness.toFixed(1)}</span>
        </div>
        
        <div className="mt-2 p-3 border rounded-md bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Control Circle Size</span>
            <span className="text-sm">{localSettings.controlCircle.diameter}</span>
          </div>
          <Slider
            min={16}
            max={32}
            step={2}
            value={[localSettings.controlCircle.diameter]}
            onValueChange={(value) => setLocalSettings(prev => ({
              ...prev,
              controlCircle: {
                ...prev.controlCircle,
                diameter: value[0]
              }
            }))}
            className="mt-2"
          />
        </div>
        
        <div className="mt-2 p-3 border rounded-md bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Control Circle Thickness</span>
            <span className="text-sm">{localSettings.controlCircle.thickness}</span>
          </div>
          <Slider
            min={1}
            max={4}
            step={0.5}
            value={[localSettings.controlCircle.thickness]}
            onValueChange={(value) => setLocalSettings(prev => ({
              ...prev,
              controlCircle: {
                ...prev.controlCircle,
                thickness: value[0]
              }
            }))}
            className="mt-2"
          />
        </div>
      </div>
      
      <div className="w-full h-px bg-gray-200 my-4"></div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm">Reset to defaults</span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocalSettings({...originalSettings})}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default AppearanceTab;
