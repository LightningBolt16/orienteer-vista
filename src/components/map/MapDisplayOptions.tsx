
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface MapDisplayOptionsProps {
  showConnections: boolean;
  setShowConnections: (show: boolean) => void;
  showControlNumbers: boolean;
  setShowControlNumbers: (show: boolean) => void;
  courseScale?: string;
  viewMode: 'edit' | 'preview';
}

const MapDisplayOptions: React.FC<MapDisplayOptionsProps> = ({
  showConnections,
  setShowConnections,
  showControlNumbers,
  setShowControlNumbers,
  courseScale,
  viewMode
}) => {
  const { t } = useLanguage();

  return (
    <div className="mt-2 flex items-center gap-4 text-sm">
      <div className="flex items-center">
        <input 
          type="checkbox" 
          id="show-connections" 
          className="mr-1" 
          checked={showConnections}
          onChange={() => setShowConnections(!showConnections)}
        />
        <label htmlFor="show-connections" className="text-xs">
          {t('show.connections')}
        </label>
      </div>
      
      <div className="flex items-center">
        <input 
          type="checkbox" 
          id="show-numbers" 
          className="mr-1" 
          checked={showControlNumbers}
          onChange={() => setShowControlNumbers(!showControlNumbers)}
        />
        <label htmlFor="show-numbers" className="text-xs">
          {t('show.numbers')}
        </label>
      </div>
      
      {viewMode === 'preview' && (
        <div className="ml-auto text-xs text-muted-foreground">
          {t('scale')}: 1:{parseInt(courseScale || '10000').toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MapDisplayOptions;
