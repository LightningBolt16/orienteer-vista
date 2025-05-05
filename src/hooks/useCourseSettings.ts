
import { useState, useEffect } from 'react';

// Default orienteering red color
export const ORIENTEERING_RED = "#ea384c";

export interface Tool {
  id: string;
  type: string;
  enabled: boolean;
  icon?: React.ReactNode;
  label?: string;
  shortcut?: string;
}

export interface CourseSettings {
  controlCircle: {
    color: string;
    diameter: number;
    thickness: number;
  };
  start: {
    color: string;
    size: number;
    thickness: number;
  };
  finish: {
    color: string;
    size: number;
    thickness: number;
  };
  line: {
    color: string;
    thickness: number;
  };
  availableTools: Tool[];
}

const defaultSettings: CourseSettings = {
  controlCircle: {
    color: ORIENTEERING_RED,
    diameter: 24,
    thickness: 2,
  },
  start: {
    color: ORIENTEERING_RED,
    size: 24,
    thickness: 2,
  },
  finish: {
    color: ORIENTEERING_RED,
    size: 24,
    thickness: 2,
  },
  line: {
    color: ORIENTEERING_RED,
    thickness: 2,
  },
  availableTools: [
    { id: 'crossing-point', type: 'crossing-point', enabled: false, shortcut: 'X' },
    { id: 'uncrossable-boundary', type: 'uncrossable-boundary', enabled: false, shortcut: 'B' },
    { id: 'out-of-bounds', type: 'out-of-bounds', enabled: false, shortcut: 'O' },
    { id: 'water-station', type: 'water-station', enabled: false, shortcut: 'W' },
  ]
};

const STORAGE_KEY = 'course-editor-settings';

export const useCourseSettings = () => {
  const [settings, setSettings] = useState<CourseSettings>(defaultSettings);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Load settings from local storage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    }
  }, []);

  // Save settings to local storage when they change
  const saveSettings = (newSettings: CourseSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  // Get enabled tools from settings
  const getEnabledTools = () => {
    return settings.availableTools.filter(tool => tool.enabled);
  };

  return {
    settings,
    saveSettings,
    getEnabledTools,
    settingsDialogOpen,
    setSettingsDialogOpen,
    resetToDefaults: () => saveSettings(defaultSettings),
  };
};
