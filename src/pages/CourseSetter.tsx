
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../components/ui/use-toast';
import useEventState, { MapInfo } from '../hooks/useEventState';
import EventSetupForm from '../components/course-setter/EventSetupForm';
import MapsList from '../components/course-setter/MapsList';
import EditorLayout from '../components/course-setter/EditorLayout';
import { useMapStorage } from '../hooks/useMapStorage';
import { useUser } from '../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ExternalLink } from 'lucide-react';

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

  // Redirect mobile users with explanatory message
  useEffect(() => {
    if (isMobile) {
      toast({
        title: "Desktop feature only",
        description: "The course setter is only available on desktop devices. Try our route choice game instead!",
        variant: "destructive"
      });
    }
  }, [isMobile]);
  
  // If mobile, render a helpful message instead of the course setter content
  if (isMobile) {
    return (
      <div className="pb-20 px-4 max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Desktop Feature Only</CardTitle>
            <CardDescription>
              The course setter requires a larger screen for the map editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our course setter tool is designed for desktop computers with larger screens
              and precision mouse input for creating detailed orienteering courses.
            </p>
            
            <p>
              We recommend trying our route choice game which is fully optimized for mobile devices!
            </p>
            
            <div className="flex flex-col space-y-2 mt-4">
              <Button 
                onClick={() => navigate('/route-game')}
                className="bg-orienteering hover:bg-orienteering/90"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Route Choice Game
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-event">{t('newEvent')}</TabsTrigger>
          <TabsTrigger value="my-maps">{t('myMaps')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-event" className="mt-6">
          <EventSetupForm 
            sampleMaps={userMaps}
            onCreateEvent={eventState.createEvent}
            preSelectedMapId={selectedMapId}
          />
        </TabsContent>
        
        <TabsContent value="my-maps" className="mt-6">
          <MapsList 
            sampleMaps={[]} // We don't want to show sample maps
            onSelectMap={handleSelectMap}
            onMapUploaded={handleMapUploaded}
            onUseMap={handleUseMap} // Pass the handler to the component
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseSetter;
