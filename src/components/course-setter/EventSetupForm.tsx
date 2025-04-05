
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MapInfo, Event } from '../../hooks/useEventState';
import { toast } from '../ui/use-toast';

interface EventSetupFormProps {
  sampleMaps: MapInfo[];
  onCreateEvent: (eventData: Omit<Event, 'id' | 'courses'>) => void;
}

const EventSetupForm: React.FC<EventSetupFormProps> = ({ sampleMaps, onCreateEvent }) => {
  const { t } = useLanguage();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string>('');

  const handleCreateEvent = () => {
    if (!selectedMapId || !eventName) {
      toast({
        title: t('error'),
        description: t('please.fill.required.fields'),
        variant: "destructive"
      });
      return;
    }
    
    const selectedMap = sampleMaps.find(map => map.id === selectedMapId);
    
    if (!selectedMap) {
      toast({
        title: t('error'),
        description: t('map.not.found'),
        variant: "destructive"
      });
      return;
    }
    
    onCreateEvent({
      name: eventName,
      date: eventDate,
      location: '',  // Default empty location
      organizer: '',  // Default empty organizer
      mapId: selectedMapId,
      mapScale: selectedMap.scale,
      mapType: selectedMap.type as 'sprint' | 'forest'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('create.new.event')}</CardTitle>
        <CardDescription>{t('setup.orienteering.event')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="event-name">{t('event.name')} *</Label>
          <Input 
            id="event-name" 
            placeholder={t('enter.event.name')} 
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="event-date">{t('event.date')}</Label>
          <Input 
            id="event-date" 
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="map-selection">{t('select.map')} *</Label>
          <Select value={selectedMapId} onValueChange={setSelectedMapId}>
            <SelectTrigger id="map-selection">
              <SelectValue placeholder={t('select.map')} />
            </SelectTrigger>
            <SelectContent>
              {sampleMaps.map(map => (
                <SelectItem key={map.id} value={map.id}>
                  {map.name} ({map.type === 'sprint' ? 'Sprint' : 'Forest'}, 1:{parseInt(map.scale).toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button className="w-full mt-4" onClick={handleCreateEvent}>
          {t('create.event')}
        </Button>
        
        <div className="text-sm text-muted-foreground mt-2">
          * {t('required.fields')}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventSetupForm;
