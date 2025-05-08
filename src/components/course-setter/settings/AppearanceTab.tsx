
import React from 'react';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { ColorPicker } from '../ColorPicker';
import { CourseSettings } from '../../../hooks/useCourseSettings';
import { Card, CardContent } from '../../ui/card';

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
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-lg font-medium">Element Color</Label>
                <p className="text-sm text-muted-foreground">
                  Choose a color for all course elements
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ColorPicker 
                  color={localSettings.controlCircle.color} 
                  onColorChange={updateAllColors}
                />
                <span className="text-sm font-mono">{localSettings.controlCircle.color}</span>
              </div>
            </div>
            
            <div className="h-px w-full bg-gray-100 my-4" />
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-medium">Control Circle Size</Label>
                  <span className="text-sm">{localSettings.controlCircle.diameter}px</span>
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
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-medium">Control Circle Thickness</Label>
                  <span className="text-sm">{localSettings.controlCircle.thickness}px</span>
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
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-medium">Line Thickness</Label>
                  <span className="text-sm">{localSettings.line.thickness.toFixed(1)}px</span>
                </div>
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
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Reset appearance to defaults</span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setLocalSettings(prev => ({
              ...prev,
              controlCircle: {...originalSettings.controlCircle},
              start: {...originalSettings.start},
              finish: {...originalSettings.finish},
              line: {...originalSettings.line},
            }))
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default AppearanceTab;
