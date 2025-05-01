
import React, { useEffect } from 'react';
import { MousePointer, Move, Circle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ToolGroup from './course-setter/ToolGroup';
import ActionButton from './course-setter/ActionButton';

export type CourseTool = 'pointer' | 'move' | 'start' | 'control' | 'finish';

interface CourseToolsProps {
  selectedTool: CourseTool;
  onToolChange: (tool: CourseTool) => void;
  onResetView: () => void;
  onPrint: () => void;
  disabled?: boolean;
}

const CourseTools: React.FC<CourseToolsProps> = ({ 
  selectedTool,
  onToolChange,
  onResetView,
  onPrint,
  disabled = false
}) => {
  const { t } = useLanguage();
  
  // Basic tools that are always shown - simplified
  const basicTools = [
    { id: 'pointer', icon: <MousePointer size={18} />, label: t('pointerTool'), shortcut: 'P' },
    { id: 'move', icon: <Move size={18} />, label: t('moveMap'), shortcut: 'M' },
    { id: 'control', icon: <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-purple-600"></div>, label: t('addControl'), shortcut: 'C' },
    { id: 'start', icon: <div className="flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,0 24,24 0,24" fill="none" stroke="#9b87f5" strokeWidth="2" />
      </svg>
    </div>, label: t('addStart'), shortcut: 'S' },
    { id: 'finish', icon: <div className="flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#9b87f5" strokeWidth="2" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#9b87f5" strokeWidth="2" />
      </svg>
    </div>, label: t('addFinish'), shortcut: 'F' }
  ];
  
  // Ensure we don't change selected tool to a disabled one
  useEffect(() => {
    if (disabled && selectedTool !== 'pointer') {
      onToolChange('pointer');
    }
  }, [disabled, selectedTool, onToolChange]);
  
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex gap-2 items-center w-full ${disabled ? 'opacity-70' : ''}`}>
      {/* Basic Tools */}
      <ToolGroup
        tools={basicTools}
        selectedTool={selectedTool}
        onValueChange={disabled ? () => {} : onToolChange}
        disabled={disabled}
      />
      
      <div className="w-px h-8 bg-gray-200"></div>
      
      {/* Reset View Button */}
      <div className="flex gap-1">
        <ActionButton
          icon={<Circle className="h-4 w-4" />}
          label={t('resetView')}
          onClick={onResetView}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default CourseTools;
