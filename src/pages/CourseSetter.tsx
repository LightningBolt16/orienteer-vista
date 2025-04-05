
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../components/ui/use-toast';
// Updated to import from default export
import useEventState, { MapInfo } from '../hooks/useEventState';
import EventSetupForm from '../components/course-setter/EventSetupForm';
import MapsList from '../components/course-setter/MapsList';
import EditorLayout from '../components/course-setter/EditorLayout';

// Sample maps for demo - this would come from an API in production
const sampleMaps: MapInfo[] = [
  { 
    id: 'map1', 
    name: 'Forest Map', 
    imageUrl: '/routes/forest/candidate_1.png',
    type: 'forest',
    scale: '10000'
  },
  { 
    id: 'map2', 
    name: 'Urban Map', 
    imageUrl: '/routes/urban/candidate_1.png',
    type: 'sprint',
    scale: '4000'
  },
  { 
    id: 'map3', 
    name: 'Default Map', 
    imageUrl: '/routes/default/candidate_1.png',
    type: 'forest',
    scale: '15000'
  },
];

const CourseSetter: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('new-event');
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  
  // Use the event state hook
  const eventState = useEventState();
  
  // Handle upload of a new map
  const handleMapUploaded = (metadata: any) => {
    // In a real implementation, this would save the file to backend storage
    // For now, we'll simulate adding it to our sampleMaps
    const newMapId = `map-${Date.now()}`;
    
    const newMap = {
      id: newMapId,
      name: metadata.name,
      imageUrl: URL.createObjectURL(metadata.file), // This URL will be temporary for demo purposes
      type: metadata.type,
      scale: metadata.scale
    };
    
    // In reality, you'd save this to your database
    console.log('New map added:', newMap);
    
    // For demo, we'll pretend it's saved
    toast({
      title: t('success'),
      description: t('map.uploaded.successfully'),
    });
    
    // Select the new map
    setSelectedMapId(newMapId);
    setActiveTab('new-event');
  };
  
  // Render the editor when an event is being created/edited
  if (eventState.isEditing && eventState.currentEvent) {
    return (
      <div className="pb-20 mx-auto overflow-x-hidden h-[calc(100vh-12rem)]">
        <EditorLayout
          currentEvent={eventState.currentEvent}
          currentCourse={eventState.currentCourse}
          selectedControl={eventState.selectedControl}
          allControls={eventState.allControls}
          sampleMaps={sampleMaps}
          onSelectCourse={eventState.selectCourse}
          onUpdateCourse={eventState.updateCourse}
          onAddCourse={eventState.addCourse}
          onAddControl={eventState.addControl}
          onUpdateControlPosition={eventState.updateControlPosition}
          onSelectControl={eventState.selectControl}
          onUpdateControlProperties={eventState.updateControlProperties}
          onDeleteControl={eventState.deleteControl}
          onExportCourse={eventState.exportCourse}
          onSaveEvent={eventState.saveEvent}
          onBack={() => eventState.setIsEditing(false)}
        />
      </div>
    );
  }
  
  // Render the initial setup screen when not editing
  return (
    <div className="pb-20 max-w-4xl mx-auto overflow-x-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-event">{t('new.event')}</TabsTrigger>
          <TabsTrigger value="my-maps">{t('my.maps')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-event" className="mt-6">
          <EventSetupForm 
            sampleMaps={sampleMaps}
            onCreateEvent={eventState.createEvent}
          />
        </TabsContent>
        
        <TabsContent value="my-maps" className="mt-6">
          <MapsList 
            sampleMaps={sampleMaps}
            onSelectMap={(mapId) => {
              setSelectedMapId(mapId);
              setActiveTab('new-event');
            }}
            onMapUploaded={handleMapUploaded}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseSetter;
