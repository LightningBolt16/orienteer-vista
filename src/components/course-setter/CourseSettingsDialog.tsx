
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogClose,
  DialogFooter
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
  CircleSlash,
  Flag,
  Square,
  Plus
} from 'lucide-react';
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
  const [useStandardSizes, setUseStandardSizes] = useState(true);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-blue-600">Customize Appearance</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sizes">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="sizes">Item Sizes</TabsTrigger>
            <TabsTrigger value="colors">Purple Color</TabsTrigger>
            <TabsTrigger value="tools">Advanced Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sizes" className="border p-4 rounded-md">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-standard-sizes" 
                  checked={useStandardSizes}
                  onCheckedChange={(checked) => setUseStandardSizes(checked === true)}
                />
                <Label htmlFor="use-standard-sizes" className="font-medium">Use IOF standard sizes</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="control-circle-diameter">Control circle diameter:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="control-circle-diameter"
                        disabled={useStandardSizes}
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
                        className="flex-1"
                      />
                      <span className="text-sm w-10 text-right">{localSettings.controlCircle.diameter}</span>
                      <span className="text-xs text-gray-500">mm</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="line-thickness">Line width:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="line-thickness"
                        disabled={useStandardSizes}
                        min={0.3}
                        max={2}
                        step={0.05}
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
                      <span className="text-sm w-10 text-right">{localSettings.line.thickness.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">mm</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="control-number-height">Control number height:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="control-number-height"
                        disabled={useStandardSizes}
                        min={2}
                        max={6}
                        step={0.5}
                        value={[4]} // Placeholder value
                        className="flex-1"
                      />
                      <span className="text-sm w-10 text-right">4.00</span>
                      <span className="text-xs text-gray-500">mm</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="control-number-style">Control number style:</Label>
                    <Select disabled={useStandardSizes} defaultValue="roboto">
                      <SelectTrigger id="control-number-style" className="w-full">
                        <SelectValue placeholder="Roboto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roboto">Roboto</SelectItem>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="pb-4">
                    <Label className="font-medium">Scale item sizes:</Label>
                    <Select disabled={useStandardSizes} defaultValue="relative">
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Relative to map scale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relative">Relative to map scale</SelectItem>
                        <SelectItem value="fixed">Fixed size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="h-48 border border-gray-200 bg-gray-50 rounded-md flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p>Preview</p>
                      <p className="text-xs">(Will display on save)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="colors" className="border p-4 rounded-md">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Blend purple with underlying map colors:</Label>
                  <Select defaultValue="layer">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Layer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="layer">Layer</SelectItem>
                      <SelectItem value="multiply">Multiply</SelectItem>
                      <SelectItem value="screen">Screen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Above map layer:</Label>
                  <Select defaultValue="violet">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Violet transparent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="violet">Violet transparent</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="magenta">Magenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox id="use-map-color" />
                  <Label htmlFor="use-map-color">Use purple color from map</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cyan:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[5]}
                        className="flex-1"
                      />
                      <span className="text-sm w-8 text-right">5.0</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Magenta:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[95]}
                        className="flex-1"
                      />
                      <span className="text-sm w-8 text-right">95.0</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Yellow:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[0]}
                        className="flex-1"
                      />
                      <span className="text-sm w-8 text-right">0.0</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Black:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[0]}
                        className="flex-1"
                      />
                      <span className="text-sm w-8 text-right">0.0</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Color for all elements:</Label>
                  <div className="mt-2">
                    <ColorPicker 
                      color={localSettings.controlCircle.color} 
                      onColorChange={(color) => {
                        setLocalSettings(prev => ({
                          ...prev, 
                          controlCircle: { ...prev.controlCircle, color },
                          start: { ...prev.start, color },
                          finish: { ...prev.finish, color },
                          line: { ...prev.line, color }
                        }));
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">Control Descriptions</Label>
                  <div className="space-y-2">
                    <Label>Color:</Label>
                    <Select defaultValue="black">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Black" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Label className="font-medium">Advanced</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="use-overprint" />
                    <Label htmlFor="use-overprint">Use overprint effect for colors marked "overprint"</Label>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tools" className="space-y-4 border p-4 rounded-md">
            <h3 className="font-medium text-sm mb-4">Enable/Disable Advanced Tools</h3>
            
            <div className="grid grid-cols-2 gap-y-4">
              {localSettings.availableTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-2">
                  <Switch 
                    id={`tool-${tool.id}`}
                    checked={tool.enabled}
                    onCheckedChange={() => handleToolToggle(tool.id)}
                  />
                  <Label htmlFor={`tool-${tool.id}`} className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center">
                      {tool.id === 'timed-start' && <Flag className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'mandatory-crossing' && <XIcon className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'optional-crossing' && <XIcon className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'out-of-bounds' && <CircleSlash className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'temporary-construction' && <Square className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'water-location' && <Droplets className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'first-aid' && <Plus className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'forbidden-route' && <XIcon className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'uncrossable-boundary' && <Slash className="h-4 w-4 text-purple-600" />}
                      {tool.id === 'registration-mark' && <Plus className="h-4 w-4 text-purple-600" />}
                    </div>
                    {tool.label}
                    {tool.shortcut && <span className="text-xs text-gray-500">({tool.shortcut})</span>}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between mt-4 pt-2 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} variant="default" className="bg-blue-600 hover:bg-blue-700">OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseSettingsDialog;
