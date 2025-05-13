
import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLanguage } from '../../context/LanguageContext';

interface MapMetadataFormProps {
  mapName: string;
  setMapName: (name: string) => void;
  mapType: 'sprint' | 'forest';
  setMapType: (type: 'sprint' | 'forest') => void;
  mapScale: string;
  setMapScale: (scale: string) => void;
  customScale: string;
  setCustomScale: (scale: string) => void;
  useCustomScale: boolean;
  setUseCustomScale: (useCustom: boolean) => void;
}

const MapMetadataForm: React.FC<MapMetadataFormProps> = ({
  mapName,
  setMapName,
  mapType,
  setMapType,
  mapScale,
  setMapScale,
  customScale,
  setCustomScale,
  useCustomScale,
  setUseCustomScale
}) => {
  const { t } = useLanguage();
  
  // Define available scales based on map type
  const sprintScales = ['4000', '3000'];
  const forestScales = ['7500', '10000', '15000'];
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="map-name">{t('map.name')}</Label>
        <Input 
          id="map-name"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder={t('enter.map.name')}
        />
      </div>
      
      <div className="space-y-2">
        <Label>{t('map.type')}</Label>
        <RadioGroup 
          value={mapType} 
          onValueChange={(value: 'sprint' | 'forest') => {
            setMapType(value);
            // Reset scale when changing map type
            if (value === 'sprint') {
              setMapScale(sprintScales[0]);
            } else {
              setMapScale(forestScales[1]); // Default to 1:10000 for forest
            }
            setUseCustomScale(false);
          }}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sprint" id="sprint" />
            <Label htmlFor="sprint">{t('sprint')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="forest" id="forest" />
            <Label htmlFor="forest">{t('forest')}</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label>{t('map.scale')}</Label>
        <div className="space-y-2">
          {!useCustomScale ? (
            <Select 
              value={mapScale}
              onValueChange={setMapScale}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('select.scale')} />
              </SelectTrigger>
              <SelectContent>
                {(mapType === 'sprint' ? sprintScales : forestScales).map(scale => (
                  <SelectItem key={scale} value={scale}>
                    1:{parseInt(scale).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center">
              <span className="mr-2">1:</span>
              <Input 
                type="text"
                value={customScale}
                onChange={(e) => setCustomScale(e.target.value)}
                placeholder="Enter custom scale"
                className="flex-1"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="custom-scale" 
              checked={useCustomScale}
              onChange={(e) => setUseCustomScale(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="custom-scale" className="text-sm">{t('use.custom.scale')}</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapMetadataForm;
