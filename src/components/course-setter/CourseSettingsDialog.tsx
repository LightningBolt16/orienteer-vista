
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { ColorPicker } from './ColorPicker';
import { useLanguage } from '../../context/LanguageContext';
import { Tool, CourseSettings } from '../../hooks/useCourseSettings';
import { 
  Flag, 
  X, 
  Square, 
  Droplets, 
  Plus, 
  Slash
} from 'lucide-react';

interface CourseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CourseSettings;
  onSettingsChange: (settings: CourseSettings) => void;
}

const CourseSettingsDialog: React.FC<CourseSettingsDialogProps> = ({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange 
}) => {
  const { t } = useLanguage();
  const [localSettings, setLocalSettings] = useState<CourseSettings>({...settings});

  // Update local settings when the prop changes
  React.useEffect(() => {
    setLocalSettings({...settings});
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  const handleToolToggle = (toolId: string) => {
    setLocalSettings(prev => {
      // Find the tool by ID
      const updatedTools = prev.availableTools.map(tool => 
        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
      );
      
      return { ...prev, availableTools: updatedTools };
    });
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Course Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tools">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="tools">Advanced Tools</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-4 border p-4 rounded-md">
            <div className="flex flex-col space-y-1 mb-2">
              <Label className="text-lg font-medium mb-2">Available Tools</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Enable or disable advanced tools for course setting
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-3">
              {localSettings.availableTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-3 p-2 border rounded-md">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {tool.id === 'timed-start' && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M4,4 L4,20" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                        <path d="M4,4 L20,12 L4,20" fill={localSettings.controlCircle.color} />
                      </svg>
                    )}
                    {(tool.id === 'mandatory-crossing' || tool.id === 'optional-crossing' || tool.id === 'forbidden-route') && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M6,6 L18,18 M6,18 L18,6" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                      </svg>
                    )}
                    {tool.id === 'out-of-bounds' && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" fill="none" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                        <path d="M8,8 L16,16 M8,16 L16,8" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                      </svg>
                    )}
                    {tool.id === 'temporary-construction' && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" fill="none" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                      </svg>
                    )}
                    {tool.id === 'water-location' && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M8,6 L8,18 C8,20 16,20 16,18 L16,6 L8,6 Z" fill="none" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                      </svg>
                    )}
                    {(tool.id === 'first-aid' || tool.id === 'registration-mark') && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M12,4 L12,20 M4,12 L20,12" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                      </svg>
                    )}
                    {tool.id === 'uncrossable-boundary' && (
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <line x1="4" y1="12" x2="20" y2="12" stroke={localSettings.controlCircle.color} strokeWidth="2" />
                        <circle cx="4" cy="12" r="2" fill={localSettings.controlCircle.color} />
                        <circle cx="20" cy="12" r="2" fill={localSettings.controlCircle.color} />
                      </svg>
                    )}
                  </div>
                  
                  <span className="flex-1 font-medium">{tool.label}</span>
                  
                  {tool.shortcut && (
                    <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                      {tool.shortcut}
                    </span>
                  )}
                  
                  <Switch
                    id={`tool-${tool.id}`}
                    checked={tool.enabled}
                    onCheckedChange={() => handleToolToggle(tool.id)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="appearance" className="border p-4 rounded-md">
            <div className="space-y-6">
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
                  onClick={() => setLocalSettings({...settings})}
                >
                  Reset
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseSettingsDialog;
