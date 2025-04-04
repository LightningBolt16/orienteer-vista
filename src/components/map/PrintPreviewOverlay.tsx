
import React from 'react';
import { PrintSettings } from '../PrintSettingsDialog';
import { useLanguage } from '../../context/LanguageContext';

interface PrintPreviewOverlayProps {
  viewMode: 'edit' | 'preview';
  printSettings?: PrintSettings;
}

const PrintPreviewOverlay: React.FC<PrintPreviewOverlayProps> = ({
  viewMode,
  printSettings
}) => {
  const { t } = useLanguage();
  
  if (viewMode !== 'preview' || !printSettings) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div 
        className="absolute border-4 border-dashed border-gray-400 bg-transparent"
        style={{
          width: printSettings.orientation === 'portrait' ? '80%' : '90%',
          height: printSettings.orientation === 'portrait' ? '90%' : '80%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="absolute top-0 left-0 -mt-6 -ml-6 bg-white px-2 py-1 rounded text-xs">
          {t('printArea')} ({printSettings.paperSize.toUpperCase()})
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewOverlay;
