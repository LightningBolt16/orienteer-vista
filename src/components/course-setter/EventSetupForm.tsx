
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapInfo } from '../../types/event';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import MapSelectionField from './form/MapSelectionField';
import MapConfigFields from './form/MapConfigFields';

interface EventSetupFormProps {
  onCreateEvent: (data: any) => void;
  sampleMaps: MapInfo[];
  preSelectedMapId?: string;
}

const EventSetupForm: React.FC<EventSetupFormProps> = ({ onCreateEvent, sampleMaps, preSelectedMapId }) => {
  const { t } = useLanguage();
  const [selectedMapType, setSelectedMapType] = useState<'forest' | 'sprint'>('forest');
  const [selectedMapScale, setSelectedMapScale] = useState<string>('10000');
  
  // Define form schema
  const FormSchema = z.object({
    eventName: z.string().min(3, { message: t('eventNameRequired') }),
    mapId: z.string().min(1, { message: t('mapRequired') }),
    mapType: z.enum(['forest', 'sprint']),
    mapScale: z.string().min(1),
  });
  
  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      eventName: '',
      mapId: preSelectedMapId || '',
      mapType: 'forest',
      mapScale: '10000',
    },
  });
  
  // Update form values when preSelectedMapId changes
  useEffect(() => {
    if (preSelectedMapId) {
      form.setValue('mapId', preSelectedMapId);
      
      // Find the selected map to set its type and scale
      const selectedMap = sampleMaps.find(map => map.id === preSelectedMapId);
      if (selectedMap) {
        form.setValue('mapType', selectedMap.type);
        form.setValue('mapScale', selectedMap.scale);
        setSelectedMapType(selectedMap.type);
        setSelectedMapScale(selectedMap.scale);
      }
    }
  }, [preSelectedMapId, sampleMaps, form]);
  
  // Handle map selection
  const handleMapChange = (mapId: string) => {
    form.setValue('mapId', mapId);
    
    // Find the selected map to set its type and scale
    const selectedMap = sampleMaps.find(map => map.id === mapId);
    if (selectedMap) {
      form.setValue('mapType', selectedMap.type);
      form.setValue('mapScale', selectedMap.scale);
      setSelectedMapType(selectedMap.type);
      setSelectedMapScale(selectedMap.scale);
    }
  };
  
  // Handle form submission
  const handleSubmit = (data: z.infer<typeof FormSchema>) => {
    // Find the selected map to pass its details
    const selectedMap = sampleMaps.find(map => map.id === data.mapId);
    
    if (selectedMap) {
      onCreateEvent({
        ...data,
        mapUrl: selectedMap.imageUrl,
        mapName: selectedMap.name,
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('newEvent')}</CardTitle>
        <CardDescription>{t('createNewEvent')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('enterEventName')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <MapSelectionField 
              form={form} 
              sampleMaps={sampleMaps} 
              onMapChange={handleMapChange} 
            />
            
            <MapConfigFields 
              form={form}
              selectedMapType={selectedMapType}
              selectedMapScale={selectedMapScale}
              setSelectedMapType={setSelectedMapType}
              setSelectedMapScale={setSelectedMapScale}
            />
            
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={sampleMaps.length === 0}
              >
                {t('createEvent')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EventSetupForm;
