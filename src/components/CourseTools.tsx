
import React, { useEffect } from 'react';
import { MousePointer, Move, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ToolGroup from './course-setter/ToolGroup';
import ActionButton from './course-setter/ActionButton';
import { StartControl, ControlCircle, FinishControl } from './map/control-shapes';

export type CourseTool = 
  'pointer' | 'move' | 'start' | 'control' | 'finish' | 
  'timed-start' | 'mandatory-crossing' | 'optional-crossing' | 'out-of-bounds' | 
  'temporary-construction' | 'water-location' | 'first-aid' | 'forbidden-route' | 
  'uncrossable-boundary' | 'registration-mark';

interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

interface CourseToolsProps {
  selectedTool: CourseTool;
  onToolChange: (tool: CourseTool) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
  enabledTools?: Array<{
    id: string;
    type: string;
    enabled: boolean;
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
  }>;
  controlColor?: string;
}

const CourseTools: React.FC<CourseToolsProps> = ({ 
  selectedTool,
  onToolChange,
  onOpenSettings,
  disabled = false,
  enabledTools = [],
  controlColor = "#f20dff" // Default bright pink color
}) => {
  const { t } = useLanguage();
  
  // Basic tools that are always shown - simplified
  const basicTools: ToolItem[] = [
    { id: 'pointer', icon: <MousePointer size={18} />, label: t('pointerTool'), shortcut: 'P' },
    { id: 'move', icon: <Move size={18} />, label: t('moveMap'), shortcut: 'M' },
    { id: 'control', icon: <ControlCircle color={controlColor} />, label: t('addControl'), shortcut: 'C' },
    { id: 'start', icon: <StartControl color={controlColor} />, label: t('addStart'), shortcut: 'S' },
    { id: 'finish', icon: <FinishControl color={controlColor} />, label: t('addFinish'), shortcut: 'F' }
  ];

  // Convert enabled tools to the correct format
  const formattedEnabledTools: ToolItem[] = enabledTools
    .filter(tool => tool.enabled)
    .map(tool => ({
      id: tool.id,
      icon: tool.icon,
      label: tool.label,
      shortcut: tool.shortcut || ''
    }));

  // Combine basic tools with enabled advanced tools
  const allTools: ToolItem[] = [...basicTools, ...formattedEnabledTools];
  
  // Ensure we don't change selected tool to a disabled one
  useEffect(() => {
    if (disabled && selectedTool !== 'pointer') {
      onToolChange('pointer');
    }
  }, [disabled, selectedTool, onToolChange]);
  
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex gap-2 items-center w-full ${disabled ? 'opacity-70' : ''}`}>
      {/* Basic and Advanced Tools */}
      <ToolGroup
        tools={allTools}
        selectedTool={selectedTool}
        onValueChange={disabled ? () => {} : onToolChange}
        disabled={disabled}
      />
      
      {/* Divider */}
      <div className="w-px h-8 bg-gray-200"></div>
      
      {/* Settings Button */}
      {onOpenSettings && (
        <div className="flex gap-1">
          <ActionButton
            icon={<Settings className="h-4 w-4" />}
            label={t('settings')}
            onClick={onOpenSettings}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default CourseTools;
