
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface LayersPanelProps {
  onClose: () => void;
  showConnections?: boolean;
  setShowConnections?: (show: boolean) => void;
  showControlNumbers?: boolean;
  setShowControlNumbers?: (show: boolean) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ 
  onClose,
  showConnections = true,
  setShowConnections = () => {},
  showControlNumbers = true,
  setShowControlNumbers = () => {}
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="absolute top-16 right-4 w-64 bg-card border rounded-lg shadow-lg p-4 z-10">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">{t('layers')}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center">
          <input type="checkbox" id="layer-map" className="mr-2" defaultChecked />
          <Label htmlFor="layer-map" className="text-sm">{t('map')}</Label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="layer-controls" className="mr-2" defaultChecked />
          <Label htmlFor="layer-controls" className="text-sm">{t('controls')}</Label>
        </div>
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="layer-connections" 
            className="mr-2" 
            checked={showConnections}
            onChange={(e) => setShowConnections(e.target.checked)}
          />
          <Label htmlFor="layer-connections" className="text-sm">{t('connections')}</Label>
        </div>
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="layer-numbers" 
            className="mr-2" 
            checked={showControlNumbers}
            onChange={(e) => setShowControlNumbers(e.target.checked)}
          />
          <Label htmlFor="layer-numbers" className="text-sm">{t('controlNumbers')}</Label>
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;
