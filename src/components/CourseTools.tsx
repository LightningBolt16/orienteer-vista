
import React, { useEffect } from 'react';
import { MousePointer, Move, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ToolGroup from './course-setter/ToolGroup';
import ActionButton from './course-setter/ActionButton';

export type CourseTool = 'pointer' | 'move' | 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';

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
    icon?: React.ReactNode;
    label?: string;
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
  controlColor = "#ea384c" // Default orienteering red color
}) => {
  const { t } = useLanguage();
  
  // Basic tools that are always shown - simplified
  const basicTools: ToolItem[] = [
    { id: 'pointer', icon: <MousePointer size={18} />, label: t('pointerTool'), shortcut: 'P' },
    { id: 'move', icon: <Move size={18} />, label: t('moveMap'), shortcut: 'M' },
    { id: 'control', icon: <div className="flex items-center justify-center w-6 h-6">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke={controlColor} strokeWidth="2" />
      </svg>
    </div>, label: t('addControl'), shortcut: 'C' },
    { id: 'start', icon: <div className="flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 2,22" fill="none" stroke={controlColor} strokeWidth="2" />
      </svg>
    </div>, label: t('addStart'), shortcut: 'S' },
    { id: 'finish', icon: <div className="flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke={controlColor} strokeWidth="2" />
        <circle cx="12" cy="12" r="6" fill="none" stroke={controlColor} strokeWidth="2" />
      </svg>
    </div>, label: t('addFinish'), shortcut: 'F' }
  ];

  // Convert enabled tools to the correct format
  const formattedEnabledTools: ToolItem[] = enabledTools
    .filter(tool => tool.enabled)
    .map(tool => ({
      id: tool.id,
      icon: tool.icon || <div>?</div>,
      label: tool.label || tool.id,
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
