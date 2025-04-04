
import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useLanguage } from '../context/LanguageContext';

interface PrintSettingsDialogProps {
  courseName: string;
  courseScale: string;
  onPrint: (settings: PrintSettings) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface PrintSettings {
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  scale: string;
  copies: number;
  showControlDescriptions: boolean;
  showCourseDetails: boolean;
}

const PrintSettingsDialog: React.FC<PrintSettingsDialogProps> = ({
  courseName,
  courseScale,
  onPrint,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}) => {
  const { t } = useLanguage();
  const [open, setInternalOpen] = useState(false);
  const [settings, setSettings] = useState<PrintSettings>({
    paperSize: 'a4',
    orientation: 'portrait',
    scale: courseScale || '10000',
    copies: 1,
    showControlDescriptions: true,
    showCourseDetails: true
  });

  // Update settings when props change
  useEffect(() => {
    if (courseScale) {
      setSettings(prev => ({
        ...prev,
        scale: courseScale
      }));
    }
  }, [courseScale]);
  
  // Sync external state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setInternalOpen(externalOpen);
    }
  }, [externalOpen]);

  const handleSettingsChange = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handlePrint = () => {
    onPrint(settings);
    handleOpenChange(false);
  };

  return (
    <Dialog open={externalOpen !== undefined ? externalOpen : open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('printSettings')}</DialogTitle>
          <DialogDescription>
            {t('configurePrintSettingsFor')}: {courseName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="paper-size" className="text-right">
              {t('paperSize')}
            </Label>
            <Select
              value={settings.paperSize}
              onValueChange={(val) => handleSettingsChange('paperSize', val)}
            >
              <SelectTrigger id="paper-size" className="col-span-2">
                <SelectValue placeholder={t('selectPaperSize')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="a3">A3</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">
              {t('orientation')}
            </Label>
            <RadioGroup
              value={settings.orientation}
              onValueChange={(val: 'portrait' | 'landscape') => handleSettingsChange('orientation', val)}
              className="col-span-2 flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portrait" id="portrait" />
                <Label htmlFor="portrait">{t('portrait')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="landscape" id="landscape" />
                <Label htmlFor="landscape">{t('landscape')}</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="scale" className="text-right">
              {t('mapScale')}
            </Label>
            <Select
              value={settings.scale}
              onValueChange={(val) => handleSettingsChange('scale', val)}
            >
              <SelectTrigger id="scale" className="col-span-2">
                <SelectValue placeholder="1:10000" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15000">1:15,000</SelectItem>
                <SelectItem value="10000">1:10,000</SelectItem>
                <SelectItem value="7500">1:7,500</SelectItem>
                <SelectItem value="5000">1:5,000</SelectItem>
                <SelectItem value="4000">1:4,000</SelectItem>
                <SelectItem value="3000">1:3,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="copies" className="text-right">
              {t('copies')}
            </Label>
            <Input
              id="copies"
              type="number"
              min="1"
              value={settings.copies}
              onChange={(e) => handleSettingsChange('copies', parseInt(e.target.value) || 1)}
              className="col-span-2"
            />
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">
              {t('include')}
            </Label>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-descriptions"
                  checked={settings.showControlDescriptions}
                  onChange={(e) => handleSettingsChange('showControlDescriptions', e.target.checked)}
                />
                <Label htmlFor="show-descriptions">{t('controlDescriptions')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-details"
                  checked={settings.showCourseDetails}
                  onChange={(e) => handleSettingsChange('showCourseDetails', e.target.checked)}
                />
                <Label htmlFor="show-details">{t('courseDetails')}</Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            {t('cancel')}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {t('print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintSettingsDialog;
