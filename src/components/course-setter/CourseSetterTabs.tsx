
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MapInfo } from '../../types/event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';
import EventSetupForm from './EventSetupForm';
import MapsList from './MapsList';

interface CourseSetterTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedMapId: string;
  userMaps: MapInfo[];
  onCreateEvent: (eventData: any) => void;
  onMapUploaded: (metadata: any) => void;
  onSelectMap: (mapId: string) => void;
  onUseMap: (mapId: string) => void;
}

const CourseSetterTabs: React.FC<CourseSetterTabsProps> = ({
  activeTab,
  setActiveTab,
  selectedMapId,
  userMaps,
  onCreateEvent,
  onMapUploaded,
  onSelectMap,
  onUseMap
}) => {
  const { t } = useLanguage();
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="new-event">{t('newEvent')}</TabsTrigger>
        <TabsTrigger value="my-maps">{t('myMaps')}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="new-event" className="mt-6">
        <EventSetupForm 
          sampleMaps={userMaps}
          onCreateEvent={onCreateEvent}
          preSelectedMapId={selectedMapId}
        />
      </TabsContent>
      
      <TabsContent value="my-maps" className="mt-6">
        <MapsList 
          sampleMaps={[]} // We don't want to show sample maps
          onSelectMap={onSelectMap}
          onMapUploaded={onMapUploaded}
          onUseMap={onUseMap}
        />
      </TabsContent>
    </Tabs>
  );
};

export default CourseSetterTabs;
