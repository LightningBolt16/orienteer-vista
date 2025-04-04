
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { CardTitle, CardDescription } from '../ui/card';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { FileText, Settings, Layers, Download, Save, Printer, Fullscreen, FullscreenExit } from 'lucide-react';
import PrintSettingsDialog from '../PrintSettingsDialog';
import { Event, Course } from '../../hooks/useEventState';

interface EditorHeaderProps {
  currentEvent: Event;
  currentCourse: Course | null;
  viewMode: 'edit' | 'preview';
  printDialogOpen: boolean;
  showLayerPanel: boolean;
  onViewModeChange: (mode: 'edit' | 'preview') => void;
  onToggleLayerPanel: () => void;
  onPrintDialogOpenChange: (open: boolean) => void;
  onExportCourse: () => void;
  onSaveEvent: () => void;
  onOpenPrintDialog: () => void;
  onPrint: (settings: any) => void;
  onBack: () => void;
  onToggleFullscreen?: () => void;
  isFullScreen?: boolean;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  currentEvent,
  currentCourse,
  viewMode,
  printDialogOpen,
  showLayerPanel,
  onViewModeChange,
  onToggleLayerPanel,
  onPrintDialogOpenChange,
  onExportCourse,
  onSaveEvent,
  onOpenPrintDialog,
  onPrint,
  onBack,
  onToggleFullscreen,
  isFullScreen = false
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-row items-center justify-between p-4 bg-card">
      <div>
        <CardTitle>{currentEvent.name}</CardTitle>
        <CardDescription>{t('eventDate')}: {currentEvent.date}</CardDescription>
      </div>
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit')}
              >
                {viewMode === 'edit' ? <FileText className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewMode === 'edit' ? t('previewMode') : t('editMode')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <PrintSettingsDialog 
          courseName={currentCourse?.name || ''}
          courseScale={currentCourse?.scale || currentEvent.mapScale}
          open={printDialogOpen}
          onOpenChange={onPrintDialogOpenChange}
          onPrint={onPrint}
        />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onToggleLayerPanel}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('toggleLayers')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onExportCourse}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('export')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onOpenPrintDialog}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('print')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onToggleFullscreen && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onToggleFullscreen}
                >
                  {isFullScreen ? <FullscreenExit className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullScreen ? t('exitFullscreen') : t('enterFullscreen')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        
        <Button onClick={onSaveEvent}>
          <Save className="h-4 w-4 mr-2" />
          {t('save')}
        </Button>
      </div>
    </div>
  );
};

export default EditorHeader;
