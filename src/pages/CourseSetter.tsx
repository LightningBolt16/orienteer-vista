
import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, Map as MapIcon, Circle, Flag, Save, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import MapEditor from '../components/MapEditor';
import MapUploader from '../components/MapUploader';
import { toast } from '../components/ui/use-toast';

// Temporary sample maps for demo
const sampleMaps = [
  { id: 'map1', name: 'Forest Map', imageUrl: '/routes/forest/candidate_1.png' },
  { id: 'map2', name: 'Urban Map', imageUrl: '/routes/urban/candidate_1.png' },
  { id: 'map3', name: 'Default Map', imageUrl: '/routes/default/candidate_1.png' },
];

// Type definitions
interface Control {
  id: string;
  type: 'start' | 'control' | 'finish';
  x: number;
  y: number;
  number?: number;
}

interface Course {
  id: string;
  name: string;
  controls: Control[];
  description: string;
}

interface Event {
  id: string;
  name: string;
  mapId: string;
  date: string;
  courses: Course[];
}

const CourseSetter: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('new-event');
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [controlType, setControlType] = useState<'start' | 'control' | 'finish'>('control');
  const [isEditing, setIsEditing] = useState(false);
  
  // Function to create a new event
  const handleCreateEvent = () => {
    if (!selectedMapId || !eventName) {
      toast({
        title: t('error'),
        description: t('please.fill.required.fields'),
        variant: "destructive"
      });
      return;
    }
    
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      name: eventName,
      mapId: selectedMapId,
      date: eventDate || new Date().toISOString().split('T')[0],
      courses: []
    };
    
    setCurrentEvent(newEvent);
    setIsEditing(true);
    
    toast({
      title: t('success'),
      description: t('event.created'),
    });
  };
  
  // Function to add a new course to the current event
  const handleAddCourse = () => {
    if (!currentEvent) return;
    
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: `Course ${currentEvent.courses.length + 1}`,
      controls: [],
      description: ''
    };
    
    setCurrentEvent({
      ...currentEvent,
      courses: [...currentEvent.courses, newCourse]
    });
    
    setCurrentCourse(newCourse);
  };
  
  // Function to handle adding a control on the map
  const handleAddControl = (x: number, y: number) => {
    if (!currentCourse) return;
    
    const newControl: Control = {
      id: `control-${Date.now()}`,
      type: controlType,
      x,
      y,
      number: controlType === 'control' ? currentCourse.controls.filter(c => c.type === 'control').length + 1 : undefined
    };
    
    const updatedControls = [...currentCourse.controls, newControl];
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    if (currentEvent) {
      const updatedCourses = currentEvent.courses.map(course => 
        course.id === currentCourse.id ? updatedCourse : course
      );
      
      setCurrentEvent({
        ...currentEvent,
        courses: updatedCourses
      });
    }
  };
  
  // Function to save event (would connect to backend in a real implementation)
  const handleSaveEvent = () => {
    if (!currentEvent) return;
    
    console.log('Saving event:', currentEvent);
    toast({
      title: t('success'),
      description: t('changes.saved'),
    });
  };
  
  // Function to select a different course to edit
  const handleSelectCourse = (courseId: string) => {
    if (!currentEvent) return;
    
    const selected = currentEvent.courses.find(course => course.id === courseId);
    if (selected) {
      setCurrentCourse(selected);
    }
  };
  
  // Render the editor when an event is being created/edited
  if (isEditing && currentEvent) {
    const selectedMap = sampleMaps.find(map => map.id === currentEvent.mapId);
    
    return (
      <div className="pb-20 max-w-7xl mx-auto">
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{currentEvent.name}</CardTitle>
              <CardDescription>{t('event.date')}: {currentEvent.date}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {t('back')}
              </Button>
              <Button onClick={handleSaveEvent}>
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left sidebar - Courses & Controls */}
              <div className="lg:col-span-1 space-y-6">
                {/* Course selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold">{t('courses')}</h3>
                    <Button size="sm" variant="ghost" onClick={handleAddCourse}>
                      <PlusCircle className="h-4 w-4 mr-1" />
                      {t('add')}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {currentEvent.courses.map(course => (
                      <Button 
                        key={course.id}
                        variant={currentCourse?.id === course.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => handleSelectCourse(course.id)}
                      >
                        {course.name}
                      </Button>
                    ))}
                    
                    {currentEvent.courses.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        {t('no.courses.yet')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Control tools */}
                {currentCourse && (
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="text-md font-semibold">{t('controls')}</h3>
                    
                    <div className="flex flex-col gap-2">
                      <Label>{t('add.control.type')}</Label>
                      <Select value={controlType} onValueChange={(value) => setControlType(value as 'start' | 'control' | 'finish')}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select.control.type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">
                            <div className="flex items-center">
                              <Flag className="h-4 w-4 mr-2 text-green-600" />
                              {t('start')}
                            </div>
                          </SelectItem>
                          <SelectItem value="control">
                            <div className="flex items-center">
                              <Circle className="h-4 w-4 mr-2 text-purple-600" />
                              {t('control')}
                            </div>
                          </SelectItem>
                          <SelectItem value="finish">
                            <div className="flex items-center">
                              <Flag className="h-4 w-4 mr-2 text-red-600" />
                              {t('finish')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label>{t('course.name')}</Label>
                      <Input 
                        value={currentCourse.name} 
                        onChange={(e) => {
                          const updated = { ...currentCourse, name: e.target.value };
                          setCurrentCourse(updated);
                          const updatedCourses = currentEvent.courses.map(course => 
                            course.id === currentCourse.id ? updated : course
                          );
                          setCurrentEvent({
                            ...currentEvent,
                            courses: updatedCourses
                          });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label>{t('course.description')}</Label>
                      <Textarea 
                        value={currentCourse.description} 
                        onChange={(e) => {
                          const updated = { ...currentCourse, description: e.target.value };
                          setCurrentCourse(updated);
                          const updatedCourses = currentEvent.courses.map(course => 
                            course.id === currentCourse.id ? updated : course
                          );
                          setCurrentEvent({
                            ...currentEvent,
                            courses: updatedCourses
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Main content - Map Editor */}
              <div className="lg:col-span-3">
                {selectedMap && (
                  <MapEditor 
                    mapUrl={selectedMap.imageUrl}
                    controls={currentCourse?.controls || []}
                    onAddControl={handleAddControl}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render the initial setup screen when not editing
  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-event">{t('new.event')}</TabsTrigger>
          <TabsTrigger value="my-maps">{t('my.maps')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-event" className="mt-6">
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
                        {map.name}
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
        </TabsContent>
        
        <TabsContent value="my-maps" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('my.maps')}</CardTitle>
              <CardDescription>{t('manage.your.maps')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('available.maps')}</h3>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('upload.map')}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleMaps.map(map => (
                  <Card key={map.id} className="overflow-hidden">
                    <div className="aspect-[4/3] relative">
                      <img 
                        src={map.imageUrl} 
                        alt={map.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{map.name}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedMapId(map.id);
                            setActiveTab('new-event');
                          }}
                        >
                          <MapIcon className="h-4 w-4 mr-2" />
                          {t('use')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6">
                <MapUploader />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseSetter;
