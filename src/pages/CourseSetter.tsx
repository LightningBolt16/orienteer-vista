import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { toast } from '../components/ui/use-toast';
import useEventState from '../hooks/useEventState';
import { MapInfo } from '../types/event';
import EditorLayout from '../components/course-setter/EditorLayout';
import { useMapStorage } from '../hooks/useMapStorage';
import { useUser } from '../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import MobileMessage from '../components/course-setter/MobileMessage';
import CourseSetterTabs from '../components/course-setter/CourseSetterTabs';

const CourseSetter: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const state = location.state as { activeTab?: string; selectedMapId?: string } | null;
  
  const [activeTab, setActiveTab] = useState(state?.activeTab || 'new-event');
  const [selectedMapId, setSelectedMapId] = useState<string>(state?.selectedMapId || '');
  
  const { user } = useUser();
  const { maps, loading: mapsLoading, fetchMaps } = useMapStorage();
  const [userMaps, setUserMaps] = useState<MapInfo[]>([]);
  
  // Use the event state hook
  const eventState = useEventState();

  // Fetch user maps when component mounts or when user changes
  useEffect(() => {
    const loadUserMaps = async () => {
      if (user) {
        const fetchedMaps = await fetchMaps();
        
        // Convert maps to MapInfo format
        const convertedMaps: MapInfo[] = fetchedMaps.map(map => ({
          id: map.id,
          name: map.name,
          imageUrl: map.file_url,
          type: map.type as 'forest' | 'sprint',
          scale: map.scale || '10000'
        }));
        
        setUserMaps(convertedMaps);
      }
    };
    
    loadUserMaps();
  }, [user, fetchMaps]);
  
  // Display mobile message if on a mobile device
  if (isMobile) {
    return <MobileMessage />;
  }
  
  // Handle upload of a new map
  const handleMapUploaded = async (metadata: any) => {
    toast({
      title: t('success'),
      description: t('mapUploaded'),
    });
    
    // Refresh the maps list
    const refreshedMaps = await fetchMaps();
    
    // Convert maps to MapInfo format
    const convertedMaps: MapInfo[] = refreshedMaps.map(map => ({
      id: map.id,
      name: map.name,
      imageUrl: map.file_url,
      type: map.type as 'forest' | 'sprint',
      scale: map.scale || '10000'
    }));
    
    setUserMaps(convertedMaps);
    
    // Select the newly uploaded map if available
    if (convertedMaps.length > 0) {
      setSelectedMapId(convertedMaps[0].id);
      setActiveTab('new-event');
    }
  };
  
  // Handle selecting a map from the list
  const handleSelectMap = (mapId: string) => {
    setSelectedMapId(mapId);
    // Auto-switch to the new event tab when a map is selected
    setActiveTab('new-event');
  };

  // Handle "Use Map" action - select map and switch to new event tab
  const handleUseMap = (mapId: string) => {
    setSelectedMapId(mapId);
    setActiveTab('new-event');
    
    // Use navigate to update URL and keep the state
    navigate('/course-setter', { 
      state: { activeTab: 'new-event', selectedMapId: mapId }
    });
    
    // Show confirmation toast
    const selectedMap = userMaps.find(map => map.id === mapId);
    if (selectedMap) {
      toast({
        title: "Map selected",
        description: `"${selectedMap.name}" is ready to use for a new course.`
      });
    }
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
          sampleMaps={userMaps}
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
      <CourseSetterTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMapId={selectedMapId}
        userMaps={userMaps}
        onCreateEvent={eventState.createEvent}
        onMapUploaded={handleMapUploaded}
        onSelectMap={handleSelectMap}
        onUseMap={handleUseMap}
      />
    </div>
  );
};

export default CourseSetter;
