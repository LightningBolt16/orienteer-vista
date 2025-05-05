
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ColorPicker } from './ColorPicker';
import { useLanguage } from '../../context/LanguageContext';
import { Tool, CourseSettings } from '../../hooks/useCourseSettings';
import { 
  CircleDashed,
  Slash,
  X as XIcon, 
  Droplets, 
  CircleSlash 
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings')}</DialogTitle>
          <DialogDescription>
            {t('courseSettingsDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance">
          <TabsList className="mb-4">
            <TabsTrigger value="appearance">{t('appearance')}</TabsTrigger>
            <TabsTrigger value="tools">{t('tools')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance" className="space-y-6">
            {/* Control Circle Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">{t('controlCircle')}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="control-circle-color">{t('color')}</Label>
                  <ColorPicker 
                    color={localSettings.controlCircle.color} 
                    onColorChange={(color) => setLocalSettings(prev => ({
                      ...prev, 
                      controlCircle: {
                        ...prev.controlCircle,
                        color
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="control-circle-diameter">{t('diameter')} ({localSettings.controlCircle.diameter}px)</Label>
                  </div>
                  <Slider
                    id="control-circle-diameter"
                    min={16}
                    max={40}
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
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="control-circle-thickness">{t('thickness')} ({localSettings.controlCircle.thickness}px)</Label>
                  </div>
                  <Slider
                    id="control-circle-thickness"
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
              </div>
            </div>
            
            {/* Line Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">{t('connectionLines')}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-color">{t('color')}</Label>
                  <ColorPicker 
                    color={localSettings.line.color} 
                    onColorChange={(color) => setLocalSettings(prev => ({
                      ...prev, 
                      line: {
                        ...prev.line,
                        color
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="line-thickness">{t('thickness')} ({localSettings.line.thickness}px)</Label>
                  </div>
                  <Slider
                    id="line-thickness"
                    min={1}
                    max={4}
                    step={0.5}
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
            
            {/* Start Triangle Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">{t('startTriangle')}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="start-color">{t('color')}</Label>
                  <ColorPicker 
                    color={localSettings.start.color} 
                    onColorChange={(color) => setLocalSettings(prev => ({
                      ...prev, 
                      start: {
                        ...prev.start,
                        color
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="start-size">{t('size')} ({localSettings.start.size}px)</Label>
                  </div>
                  <Slider
                    id="start-size"
                    min={16}
                    max={40}
                    step={2}
                    value={[localSettings.start.size]}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      start: {
                        ...prev.start,
                        size: value[0]
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="start-thickness">{t('thickness')} ({localSettings.start.thickness}px)</Label>
                  </div>
                  <Slider
                    id="start-thickness"
                    min={1}
                    max={4}
                    step={0.5}
                    value={[localSettings.start.thickness]}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      start: {
                        ...prev.start,
                        thickness: value[0]
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Finish Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">{t('finishCircles')}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="finish-color">{t('color')}</Label>
                  <ColorPicker 
                    color={localSettings.finish.color} 
                    onColorChange={(color) => setLocalSettings(prev => ({
                      ...prev, 
                      finish: {
                        ...prev.finish,
                        color
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="finish-size">{t('size')} ({localSettings.finish.size}px)</Label>
                  </div>
                  <Slider
                    id="finish-size"
                    min={16}
                    max={40}
                    step={2}
                    value={[localSettings.finish.size]}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      finish: {
                        ...prev.finish,
                        size: value[0]
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="finish-thickness">{t('thickness')} ({localSettings.finish.thickness}px)</Label>
                  </div>
                  <Slider
                    id="finish-thickness"
                    min={1}
                    max={4}
                    step={0.5}
                    value={[localSettings.finish.thickness]}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      finish: {
                        ...prev.finish,
                        thickness: value[0]
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tools" className="space-y-4">
            <h3 className="font-medium text-sm">{t('availableTools')}</h3>
            
            <div className="space-y-4">
              {localSettings.availableTools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {tool.id === 'crossing-point' && <XIcon className="h-5 w-5" />}
                      {tool.id === 'uncrossable-boundary' && <Slash className="h-5 w-5" />}
                      {tool.id === 'out-of-bounds' && <CircleSlash className="h-5 w-5" />}
                      {tool.id === 'water-station' && <Droplets className="h-5 w-5" />}
                    </div>
                    <Label htmlFor={`tool-${tool.id}`}>{t(`tool.${tool.id}`)}</Label>
                  </div>
                  <Switch 
                    id={`tool-${tool.id}`}
                    checked={tool.enabled}
                    onCheckedChange={() => handleToolToggle(tool.id)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t('saveChanges')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseSettingsDialog;
