
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useLanguage } from '../../context/LanguageContext';
import { CourseSettings } from '../../hooks/useCourseSettings';
import ToolsTab from './settings/ToolsTab';
import AppearanceTab from './settings/AppearanceTab';

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

  // Update local settings when the prop changes
  React.useEffect(() => {
    setLocalSettings({...settings});
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Course Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="tools">Advanced Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance">
            <AppearanceTab 
              localSettings={localSettings} 
              setLocalSettings={setLocalSettings} 
              originalSettings={settings}
            />
          </TabsContent>
          
          <TabsContent value="tools">
            <ToolsTab 
              localSettings={localSettings} 
              setLocalSettings={setLocalSettings} 
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseSettingsDialog;
