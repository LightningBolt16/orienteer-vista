
import { useState } from 'react';
import { toast } from '../components/ui/use-toast';
import { PrintSettings } from '../components/PrintSettingsDialog';

export function usePrintSettings() {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [currentPrintSettings, setCurrentPrintSettings] = useState<PrintSettings>({
    paperSize: 'a4',
    orientation: 'portrait',
    scale: '10000',
    copies: 1,
    showControlDescriptions: true,
    showCourseDetails: true
  });

  const handleOpenPrintDialog = (courseScale?: string) => {
    if (courseScale) {
      setCurrentPrintSettings(prev => ({
        ...prev,
        scale: courseScale
      }));
    }
    setPrintDialogOpen(true);
  };

  const handlePrint = (settings: PrintSettings) => {
    setCurrentPrintSettings(settings);
    
    console.log('Print settings:', settings);
    
    // In a real implementation, this would generate a PDF or print dialog
    toast({
      title: "Success",
      description: "Preparing print...",
    });
    
    setPrintDialogOpen(false);
  };

  return {
    printDialogOpen,
    setPrintDialogOpen,
    currentPrintSettings,
    handleOpenPrintDialog,
    handlePrint
  };
}
