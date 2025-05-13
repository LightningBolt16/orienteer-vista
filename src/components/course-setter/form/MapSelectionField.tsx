
import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { MapInfo } from '../../../types/event';
import { UseFormReturn } from 'react-hook-form';

interface MapSelectionFieldProps {
  form: UseFormReturn<any>;
  sampleMaps: MapInfo[];
  onMapChange: (mapId: string) => void;
}

const MapSelectionField: React.FC<MapSelectionFieldProps> = ({ form, sampleMaps, onMapChange }) => {
  const { t } = useLanguage();
  
  return (
    <FormField
      control={form.control}
      name="mapId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('map')}</FormLabel>
          <Select 
            value={field.value} 
            onValueChange={(value) => onMapChange(value)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('selectMap')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {sampleMaps.length === 0 ? (
                <SelectItem value="no-maps" disabled>{t('noMapsAvailable')}</SelectItem>
              ) : (
                sampleMaps.map((map) => (
                  <SelectItem key={map.id} value={map.id}>
                    {map.name} ({map.type === 'forest' ? 'Forest' : 'Sprint'}, 1:{parseInt(map.scale).toLocaleString()})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default MapSelectionField;
