
import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { CourseSettings } from '../../../hooks/useCourseSettings';

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
    </div>
  );
};

export default ToolsTab;
