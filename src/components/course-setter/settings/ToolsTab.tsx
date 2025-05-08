
import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { CourseSettings } from '../../../hooks/useCourseSettings';
import ToolIconsBuilder from '../../map/ToolIconsBuilder';

interface ToolsTabProps {
  localSettings: CourseSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<CourseSettings>>;
}

const ToolsTab: React.FC<ToolsTabProps> = ({ localSettings, setLocalSettings }) => {
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
    <div className="space-y-4 border p-4 rounded-md">
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
              <ToolIconsBuilder toolId={tool.id} toolColor={localSettings.controlCircle.color} />
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
    </div>
  );
};

export default ToolsTab;
