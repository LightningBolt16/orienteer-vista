
import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, Map as MapIcon, Circle, Flag, Save, Trash2, Download, Layers, FileText, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from '../components/ui/use-toast';
import MapEditor from '../components/MapEditor';
import MapUploader from '../components/MapUploader';
import CourseList from '../components/CourseList';
import ControlProperties from '../components/ControlProperties';

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
  code?: string;
  description?: string;
}

interface Course {
  id: string;
  name: string;
  controls: Control[];
  description: string;
  length?: number;
  climb?: number;
  scale?: string;
}

interface Event {
  id: string;
  name: string;
  mapId: string;
  date: string;
  courses: Course[];
  location?: string;
  organizer?: string;
}

const CourseSetter: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('new-event');
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
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
      description: '',
      length: 0,
      climb: 0,
      scale: '1:10000'
    };
    
    setCurrentEvent({
      ...currentEvent,
      courses: [...currentEvent.courses, newCourse]
    });
    
    setCurrentCourse(newCourse);
  };
  
  // Function to handle adding a control on the map
  const handleAddControl = (newControl: Control) => {
    if (!currentCourse) return;
    
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
  
  // Function to update control position (for drag and drop)
  const handleUpdateControlPosition = (controlId: string, x: number, y: number) => {
    if (!currentCourse) return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, x, y } : control
    );
    
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
  
  // Function to delete a control
  const handleDeleteControl = (controlId: string) => {
    if (!currentCourse) return;
    
    const updatedControls = currentCourse.controls.filter(control => control.id !== controlId);
    
    // Renumber the control points
    const renumberedControls = updatedControls.map((control, index) => {
      if (control.type === 'control') {
        return { ...control, number: index + 1 };
      }
      return control;
    });
    
    const updatedCourse = { ...currentCourse, controls: renumberedControls };
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
    
    setSelectedControl(null);
    
    toast({
      title: t('success'),
      description: t('control.deleted'),
    });
  };
  
  // Function to update control properties
  const handleUpdateControlProperties = (controlId: string, updates: Partial<Control>) => {
    if (!currentCourse) return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, ...updates } : control
    );
    
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
    
    // Update selected control if it's the one being edited
    if (selectedControl && selectedControl.id === controlId) {
      setSelectedControl({ ...selectedControl, ...updates });
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
      setSelectedControl(null); // Reset selected control when changing course
    }
  };
  
  // Function to export the current course
  const handleExportCourse = () => {
    if (!currentCourse) return;
    
    // In a real implementation, this would generate a file for export
    console.log('Exporting course:', currentCourse);
    toast({
      title: t('success'),
      description: t('course.exported'),
    });
  };
  
  // Function to handle control selection
  const handleControlSelect = (control: Control) => {
    setSelectedControl(control);
  };
  
  // Render the editor when an event is being created/edited
  if (isEditing && currentEvent) {
    const selectedMap = sampleMaps.find(map => map.id === currentEvent.mapId);
    
    return (
      <div className="pb-20 mx-auto overflow-x-hidden h-[calc(100vh-12rem)]">
        <Card className="mt-8 h-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-4 bg-card">
            <div>
              <CardTitle>{currentEvent.name}</CardTitle>
              <CardDescription>{t('event.date')}: {currentEvent.date}</CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                    >
                      {viewMode === 'edit' ? <FileText className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {viewMode === 'edit' ? t('preview.mode') : t('edit.mode')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowLayerPanel(!showLayerPanel)}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('toggle.layers')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleExportCourse}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('export')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {t('back')}
              </Button>
              
              <Button onClick={handleSaveEvent}>
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </CardHeader>
          
          <div className="flex h-[calc(100%-4rem)]">
            {/* Left sidebar - Courses */}
            <div className="w-64 border-r flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">{t('courses')}</h3>
                  <Button size="sm" variant="ghost" onClick={handleAddCourse}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    {t('add')}
                  </Button>
                </div>
                
                <ScrollArea className="h-48 pr-3">
                  <CourseList 
                    courses={currentEvent.courses}
                    activeCourseId={currentCourse?.id}
                    onSelectCourse={handleSelectCourse}
                  />
                </ScrollArea>
              </div>
              
              {currentCourse && (
                <div className="p-4 flex-1 overflow-auto">
                  <div className="space-y-4">
                    <div>
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
                    
                    <div>
                      <Label>{t('course.length')} (km)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={currentCourse.length || ''} 
                        onChange={(e) => {
                          const updated = { ...currentCourse, length: parseFloat(e.target.value) || 0 };
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
                    
                    <div>
                      <Label>{t('course.climb')} (m)</Label>
                      <Input 
                        type="number"
                        value={currentCourse.climb || ''} 
                        onChange={(e) => {
                          const updated = { ...currentCourse, climb: parseInt(e.target.value) || 0 };
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
                    
                    <div>
                      <Label>{t('course.scale')}</Label>
                      <Select 
                        value={currentCourse.scale || '1:10000'}
                        onValueChange={(value) => {
                          const updated = { ...currentCourse, scale: value };
                          setCurrentCourse(updated);
                          const updatedCourses = currentEvent.courses.map(course => 
                            course.id === currentCourse.id ? updated : course
                          );
                          setCurrentEvent({
                            ...currentEvent,
                            courses: updatedCourses
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('select.scale')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:10000">1:10,000</SelectItem>
                          <SelectItem value="1:15000">1:15,000</SelectItem>
                          <SelectItem value="1:7500">1:7,500</SelectItem>
                          <SelectItem value="1:5000">1:5,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
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
                </div>
              )}
            </div>
            
            {/* Main content - Map Editor */}
            <div className="flex-1 h-full overflow-hidden relative">
              {selectedMap && currentCourse && (
                <MapEditor 
                  mapUrl={selectedMap.imageUrl}
                  controls={currentCourse.controls || []}
                  onAddControl={handleAddControl}
                  onUpdateControl={handleUpdateControlPosition}
                  onSelectControl={handleControlSelect}
                  viewMode={viewMode}
                />
              )}
            </div>
            
            {/* Right sidebar - Control Properties */}
            {viewMode === 'edit' && selectedControl && (
              <div className="w-64 border-l p-4">
                <ControlProperties 
                  control={selectedControl}
                  onUpdateControl={(updates) => handleUpdateControlProperties(selectedControl.id, updates)}
                  onDeleteControl={() => handleDeleteControl(selectedControl.id)}
                />
              </div>
            )}
            
            {/* Layers panel */}
            {showLayerPanel && (
              <div className="absolute top-16 right-4 w-64 bg-card border rounded-lg shadow-lg p-4 z-10">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold">{t('layers')}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={() => setShowLayerPanel(false)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="layer-map" className="mr-2" defaultChecked />
                    <Label htmlFor="layer-map" className="text-sm">{t('map')}</Label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="layer-controls" className="mr-2" defaultChecked />
                    <Label htmlFor="layer-controls" className="text-sm">{t('controls')}</Label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="layer-connections" className="mr-2" defaultChecked />
                    <Label htmlFor="layer-connections" className="text-sm">{t('connections')}</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
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
