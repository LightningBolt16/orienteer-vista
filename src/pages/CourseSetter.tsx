
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, Map as MapIcon, Circle, Flag, Save, Trash2, Download, Layers, FileText, Settings, Printer } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import MapEditor from '../components/MapEditor';
import MapUploader, { MapMetadata } from '../components/MapUploader';
import CourseList from '../components/CourseList';
import ControlProperties from '../components/ControlProperties';
import PrintSettingsDialog, { PrintSettings } from '../components/PrintSettingsDialog';

// Sample maps for demo - this would come from an API in production
const sampleMaps = [
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

// Type definitions
interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
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
  mapScale: string;
  mapType: 'sprint' | 'forest';
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
  const [allControls, setAllControls] = useState<Control[]>([]);
  
  // Update all controls when any course changes
  useEffect(() => {
    if (currentEvent) {
      // Collect all controls from all courses
      const controls: Control[] = [];
      currentEvent.courses.forEach(course => {
        course.controls.forEach(control => {
          // Check if control already exists at same position
          const existing = controls.find(c => 
            Math.abs(c.x - control.x) < 0.5 && 
            Math.abs(c.y - control.y) < 0.5 && 
            c.type === control.type
          );
          
          if (!existing) {
            controls.push(control);
          }
        });
      });
      setAllControls(controls);
    }
  }, [currentEvent]);
  
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
    
    const selectedMap = sampleMaps.find(map => map.id === selectedMapId);
    
    if (!selectedMap) {
      toast({
        title: t('error'),
        description: t('map.not.found'),
        variant: "destructive"
      });
      return;
    }
    
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      name: eventName,
      mapId: selectedMapId,
      mapScale: selectedMap.scale,
      mapType: selectedMap.type as 'sprint' | 'forest',
      date: eventDate || new Date().toISOString().split('T')[0],
      courses: []
    };
    
    // Create default "All Controls" course
    const allControlsCourse: Course = {
      id: `course-all-controls`,
      name: 'All Controls',
      controls: [],
      description: 'Course with all control points',
      length: 0,
      climb: 0,
      scale: selectedMap.scale
    };
    
    newEvent.courses.push(allControlsCourse);
    
    setCurrentEvent(newEvent);
    setCurrentCourse(allControlsCourse);
    setIsEditing(true);
    
    toast({
      title: t('success'),
      description: t('event.created'),
    });
  };
  
  // Handle upload of a new map
  const handleMapUploaded = (metadata: MapMetadata) => {
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
  
  // Function to add a new course to the current event
  const handleAddCourse = () => {
    if (!currentEvent) return;
    
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: `Course ${currentEvent.courses.filter(c => c.id !== 'course-all-controls').length + 1}`,
      controls: [],
      description: '',
      length: 0,
      climb: 0,
      scale: currentEvent.mapScale
    };
    
    setCurrentEvent({
      ...currentEvent,
      courses: [...currentEvent.courses, newCourse]
    });
    
    setCurrentCourse(newCourse);
  };
  
  // Function to handle adding a control on the map
  const handleAddControl = (newControl: Control) => {
    if (!currentCourse || !currentEvent) return;
    
    const updatedControls = [...currentCourse.controls, newControl];
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    
    // Update current course
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    const updatedCourses = currentEvent.courses.map(course => 
      course.id === currentCourse.id ? updatedCourse : course
    );
    
    // Add to all-controls course if not already there
    let allControlsUpdated = false;
    const finalCourses = updatedCourses.map(course => {
      if (course.id === 'course-all-controls') {
        // Check if control already exists at similar position
        const existingSimilar = course.controls.some(c => 
          Math.abs(c.x - newControl.x) < 0.5 && 
          Math.abs(c.y - newControl.y) < 0.5 && 
          c.type === newControl.type
        );
        
        if (!existingSimilar) {
          allControlsUpdated = true;
          return {
            ...course,
            controls: [...course.controls, newControl]
          };
        }
      }
      return course;
    });
    
    setCurrentEvent({
      ...currentEvent,
      courses: finalCourses
    });
  };
  
  // Function to update control position (for drag and drop)
  const handleUpdateControlPosition = (controlId: string, x: number, y: number) => {
    if (!currentCourse || !currentEvent) return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, x, y } : control
    );
    
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event and all-controls course if needed
    const updatedCourses = currentEvent.courses.map(course => {
      if (course.id === currentCourse.id) {
        return updatedCourse;
      } else if (course.id === 'course-all-controls') {
        // Update position in all-controls course if it exists there
        const controlInAllControls = course.controls.find(c => c.id === controlId);
        if (controlInAllControls) {
          return {
            ...course,
            controls: course.controls.map(c => 
              c.id === controlId ? { ...c, x, y } : c
            )
          };
        }
      }
      return course;
    });
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
  };
  
  // Function to delete a control
  const handleDeleteControl = (controlId: string) => {
    if (!currentCourse || !currentEvent) return;
    
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
    const updatedCourses = currentEvent.courses.map(course => {
      if (course.id === currentCourse.id) {
        return updatedCourse;
      }
      return course;
    });
    
    // Don't automatically delete from all-controls to avoid affecting other courses
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
    
    setSelectedControl(null);
    
    toast({
      title: t('success'),
      description: t('control.deleted'),
    });
  };
  
  // Function to update control properties
  const handleUpdateControlProperties = (controlId: string, updates: Partial<Control>) => {
    if (!currentCourse || !currentEvent) return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, ...updates } : control
    );
    
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    const updatedCourses = currentEvent.courses.map(course => 
      course.id === currentCourse.id ? updatedCourse : course
    );
    
    // Check if this control exists in all-controls and update if needed
    const updatedAllCourses = updatedCourses.map(course => {
      if (course.id === 'course-all-controls') {
        return {
          ...course,
          controls: course.controls.map(c => 
            c.id === controlId ? { ...c, ...updates } : c
          )
        };
      }
      return course;
    });
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedAllCourses
    });
    
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
  
  // Function to handle print settings
  const handlePrint = (settings: PrintSettings) => {
    if (!currentCourse || !currentEvent) return;
    
    console.log('Print settings:', settings);
    console.log('Course to print:', currentCourse);
    
    // In a real implementation, this would generate a PDF or print dialog
    toast({
      title: t('success'),
      description: t('preparing.print'),
    });
  };
  
  // Function to update course details
  const handleUpdateCourse = (courseId: string, updates: Partial<Course>) => {
    if (!currentEvent) return;
    
    const updatedCourses = currentEvent.courses.map(course => 
      course.id === courseId ? { ...course, ...updates } : course
    );
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
    
    if (currentCourse?.id === courseId) {
      setCurrentCourse({ ...currentCourse, ...updates });
    }
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
              
              {currentCourse && viewMode === 'preview' && (
                <PrintSettingsDialog 
                  courseName={currentCourse.name}
                  courseScale={currentCourse.scale || currentEvent.mapScale}
                  onPrint={handlePrint}
                />
              )}
              
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
                        onChange={(e) => handleUpdateCourse(currentCourse.id, { name: e.target.value })}
                        disabled={currentCourse.id === 'course-all-controls'}
                      />
                    </div>
                    
                    <div>
                      <Label>{t('course.length')} (km)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={currentCourse.length || ''} 
                        onChange={(e) => handleUpdateCourse(currentCourse.id, { length: parseFloat(e.target.value) || 0 })}
                        disabled={currentCourse.id === 'course-all-controls'}
                      />
                    </div>
                    
                    <div>
                      <Label>{t('course.climb')} (m)</Label>
                      <Input 
                        type="number"
                        value={currentCourse.climb || ''} 
                        onChange={(e) => handleUpdateCourse(currentCourse.id, { climb: parseInt(e.target.value) || 0 })}
                        disabled={currentCourse.id === 'course-all-controls'}
                      />
                    </div>
                    
                    <div>
                      <Label>{t('course.scale')}</Label>
                      <Select 
                        value={currentCourse.scale || currentEvent.mapScale}
                        onValueChange={(value) => handleUpdateCourse(currentCourse.id, { scale: value })}
                        disabled={currentCourse.id === 'course-all-controls'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('select.scale')} />
                        </SelectTrigger>
                        <SelectContent>
                          {currentEvent.mapType === 'sprint' ? (
                            <>
                              <SelectItem value="4000">1:4,000</SelectItem>
                              <SelectItem value="3000">1:3,000</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="15000">1:15,000</SelectItem>
                              <SelectItem value="10000">1:10,000</SelectItem>
                              <SelectItem value="7500">1:7,500</SelectItem>
                            </>
                          )}
                          <SelectItem value="5000">1:5,000</SelectItem>
                          <SelectItem value="custom">Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {currentCourse.scale === 'custom' && (
                        <div className="mt-2 flex items-center">
                          <span className="mr-2">1:</span>
                          <Input
                            type="text"
                            placeholder="Custom scale"
                            onChange={(e) => {
                              // Handle custom scale input
                              const value = e.target.value.trim();
                              if (value && !isNaN(parseInt(value))) {
                                handleUpdateCourse(currentCourse.id, { scale: value });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>{t('course.description')}</Label>
                      <Textarea 
                        value={currentCourse.description} 
                        onChange={(e) => handleUpdateCourse(currentCourse.id, { description: e.target.value })}
                        disabled={currentCourse.id === 'course-all-controls'}
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
                  allControls={allControls} // For snapping
                  snapDistance={2} // 2% snap distance
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
                    <X className="h-4 w-4" />
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
                      <div className="flex flex-col">
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
                        <div className="mt-1 text-sm text-muted-foreground">
                          {map.type === 'sprint' ? 'Sprint' : 'Forest'} • 1:{parseInt(map.scale).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6">
                <MapUploader onMapUploaded={handleMapUploaded} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseSetter;
