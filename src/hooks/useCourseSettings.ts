
import { useState, useEffect } from 'react';
import React from 'react';

// Default orienteering purple color, changed from red
export const ORIENTEERING_PURPLE = "#9b87f5";

export interface Tool {
  id: string;
  type: string;
  enabled: boolean;
  icon: React.ReactNode;
  label: string;
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
    color: ORIENTEERING_PURPLE,
    diameter: 24,
    thickness: 2,
  },
  start: {
    color: ORIENTEERING_PURPLE,
    size: 24,
    thickness: 2,
  },
  finish: {
    color: ORIENTEERING_PURPLE,
    size: 24,
    thickness: 2,
  },
  line: {
    color: ORIENTEERING_PURPLE,
    thickness: 0.5, // Reduced to be much thinner
  },
  availableTools: [
    { id: 'timed-start', type: 'timed-start', enabled: false, icon: null, label: 'Timed Start', shortcut: 'T' },
    { id: 'mandatory-crossing', type: 'mandatory-crossing', enabled: false, icon: null, label: 'Mandatory Crossing Point', shortcut: 'M' },
    { id: 'optional-crossing', type: 'optional-crossing', enabled: false, icon: null, label: 'Optional Crossing Point', shortcut: 'O' },
    { id: 'out-of-bounds', type: 'out-of-bounds', enabled: false, icon: null, label: 'Out Of Bounds Area', shortcut: 'B' },
    { id: 'temporary-construction', type: 'temporary-construction', enabled: false, icon: null, label: 'Temporary Construction', shortcut: 'C' },
    { id: 'water-location', type: 'water-location', enabled: false, icon: null, label: 'Water Location', shortcut: 'W' },
    { id: 'first-aid', type: 'first-aid', enabled: false, icon: null, label: 'First Aid Location', shortcut: 'A' },
    { id: 'forbidden-route', type: 'forbidden-route', enabled: false, icon: null, label: 'Forbidden Route Marking', shortcut: 'F' },
    { id: 'uncrossable-boundary', type: 'uncrossable-boundary', enabled: false, icon: null, label: 'Uncrossable Boundary', shortcut: 'U' },
    { id: 'registration-mark', type: 'registration-mark', enabled: false, icon: null, label: 'Registration Mark', shortcut: 'R' },
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
