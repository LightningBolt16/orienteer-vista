
import React, { useState, useEffect } from 'react';
import { MousePointer, Move, Circle, Flag } from 'lucide-react';
import { Button } from './ui/button';
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
    { id: 'control', icon: <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-purple-600"></div>, label: t('addControl'), shortcut: 'C' },
    { id: 'start', icon: <div className="flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 28 28">
        <polygon points="14,0 28,28 0,28" fill="none" stroke="#D946EF" strokeWidth="2" />
      </svg>
    </div>, label: t('addStart'), shortcut: 'S' },
    { id: 'finish', icon: <div className="flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="none" stroke="#ef4444" strokeWidth="2" />
        <circle cx="14" cy="14" r="8" fill="none" stroke="#ef4444" strokeWidth="2" />
      </svg>
    </div>, label: t('addFinish'), shortcut: 'F' }
  ];
  
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
