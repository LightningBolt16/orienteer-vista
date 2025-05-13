
import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { UseFormReturn } from 'react-hook-form';

interface MapConfigFieldsProps {
  form: UseFormReturn<any>;
  selectedMapType: 'forest' | 'sprint';
  selectedMapScale: string;
  setSelectedMapType: (type: 'forest' | 'sprint') => void;
  setSelectedMapScale: (scale: string) => void;
}

const MapConfigFields: React.FC<MapConfigFieldsProps> = ({
  form,
  selectedMapType,
  selectedMapScale,
  setSelectedMapType,
  setSelectedMapScale
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="mapType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('mapType')}</FormLabel>
            <Select 
              value={field.value}
              onValueChange={(value: 'forest' | 'sprint') => {
                field.onChange(value);
                setSelectedMapType(value);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="forest">Forest</SelectItem>
                <SelectItem value="sprint">Sprint</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="mapScale"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('mapScale')}</FormLabel>
            <Select 
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                setSelectedMapScale(value);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="4000">1:4,000</SelectItem>
                <SelectItem value="5000">1:5,000</SelectItem>
                <SelectItem value="7500">1:7,500</SelectItem>
                <SelectItem value="10000">1:10,000</SelectItem>
                <SelectItem value="15000">1:15,000</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default MapConfigFields;
