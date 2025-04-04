
import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { toast } from '../components/ui/use-toast';
import { updateAllControlsCourse, collectAllUniqueControls } from './useEventCalculations';
import { getCourseDistanceInKm } from './useEventSelectors';
import { useLanguage } from '../context/LanguageContext';

// Types
export interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  controls: Control[];
  length?: number; // in kilometers
  climb?: number; // in meters
  scale?: string; // e.g., '10000' for 1:10000
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  organizer: string;
  mapId: string;
  mapType: 'sprint' | 'forest';
  mapScale: string;
  courses: Course[];
}

export interface MapInfo {
  id: string;
  name: string;
  imageUrl: string;
  type: 'sprint' | 'forest';
  scale: string;
}

const useEventState = () => {
  const { t } = useLanguage();
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allControls, setAllControls] = useState<Control[]>([]);

  // Computed values
  const currentCourse = currentEvent && currentCourseId
    ? currentEvent.courses.find(course => course.id === currentCourseId) || null
    : null;
    
  const selectedControl = currentEvent && selectedControlId 
    ? currentEvent.courses
        .flatMap(course => course.controls)
        .find(control => control.id === selectedControlId) || null
    : null;

  // Create a new event
  const createEvent = useCallback((eventData: Omit<Event, 'id' | 'courses'>) => {
    const newEventId = `event-${nanoid()}`;
    const allControlsCourseId = 'course-all-controls';
    
    const newEvent: Event = {
      id: newEventId,
      ...eventData,
      courses: [
        {
          id: allControlsCourseId,
          name: t('allControls'),
          description: t('allControlsDescription'),
          controls: [],
        },
        {
          id: `course-${nanoid()}`,
          name: t('defaultCourseName'),
          description: '',
          controls: [],
        },
      ],
    };
    
    setCurrentEvent(newEvent);
    setCurrentCourseId(newEvent.courses[1].id); // Select the default course, not all-controls
    setIsEditing(true);
  }, [t]);

  // Add a new course
  const addCourse = useCallback(() => {
    if (!currentEvent) return;
    
    const newCourseId = `course-${nanoid()}`;
    const courseNumber = currentEvent.courses.length;
    
    const newCourse: Course = {
      id: newCourseId,
      name: `${t('course')} ${courseNumber}`,
      description: '',
      controls: [],
    };
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      return {
        ...prev,
        courses: [...prev.courses, newCourse],
      };
    });
    
    setCurrentCourseId(newCourseId);
    toast({
      title: t('courseAdded'),
      description: `${newCourse.name} ${t('hasBeenAdded')}`
    });
  }, [currentEvent, t]);

  // Select a course
  const selectCourse = useCallback((courseId: string) => {
    setCurrentCourseId(courseId);
    setSelectedControlId(null);
  }, []);

  // Update course
  const updateCourse = useCallback((courseId: string, updates: Partial<Course>) => {
    if (!currentEvent) return;
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        if (course.id === courseId) {
          return { ...course, ...updates };
        }
        return course;
      });
      
      return { ...prev, courses: updatedCourses };
    });
  }, [currentEvent]);

  // Add control to course
  const addControl = useCallback((control: Control) => {
    if (!currentEvent || !currentCourseId) return;
    
    // Don't add control to all-controls course
    if (currentCourseId === 'course-all-controls') {
      toast({
        title: t('cannotAddControlToAllControls'),
        description: t('selectAnotherCourse'),
        variant: 'destructive',
      });
      return;
    }
    
    // Generate control number based on existing controls
    let controlNumber = 1;
    if (control.type === 'control') {
      const currentCourse = currentEvent.courses.find(course => course.id === currentCourseId);
      if (currentCourse) {
        const existingControls = currentCourse.controls.filter(c => c.type === 'control');
        controlNumber = existingControls.length + 1;
      }
    }
    
    const newControl: Control = {
      ...control,
      id: `control-${nanoid()}`,
      number: control.type === 'control' ? controlNumber : undefined,
      code: control.type === 'control' ? `${controlNumber}` : undefined,
    };
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        if (course.id === currentCourseId) {
          return {
            ...course,
            controls: [...course.controls, newControl],
          };
        }
        return course;
      });
      
      const updatedEvent = { ...prev, courses: updatedCourses };
      
      // Update the all-controls course
      const allControls = collectAllUniqueControls(updatedEvent.courses);
      setAllControls(allControls);
      return updateAllControlsCourse(updatedEvent, allControls);
    });
    
    setSelectedControlId(newControl.id);
  }, [currentEvent, currentCourseId, t]);

  // Update control position
  const updateControlPosition = useCallback((id: string, x: number, y: number) => {
    if (!currentEvent) return;
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        const updatedControls = course.controls.map(control => {
          if (control.id === id) {
            return { ...control, x, y };
          }
          return control;
        });
        
        return {
          ...course,
          controls: updatedControls,
        };
      });
      
      const updatedEvent = { ...prev, courses: updatedCourses };
      
      // Update the all-controls course
      const allControls = collectAllUniqueControls(updatedEvent.courses);
      setAllControls(allControls);
      return updateAllControlsCourse(updatedEvent, allControls);
    });
  }, [currentEvent]);

  // Select a control
  const selectControl = useCallback((control: Control) => {
    setSelectedControlId(control.id);
  }, []);

  // Update control properties
  const updateControlProperties = useCallback((id: string, updates: Partial<Control>) => {
    if (!currentEvent) return;
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        const updatedControls = course.controls.map(control => {
          if (control.id === id) {
            return { ...control, ...updates };
          }
          return control;
        });
        
        return {
          ...course,
          controls: updatedControls,
        };
      });
      
      return { ...prev, courses: updatedCourses };
    });
  }, [currentEvent]);

  // Delete a control
  const deleteControl = useCallback((id: string) => {
    if (!currentEvent || !currentCourseId) return;
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        if (course.id === currentCourseId) {
          const updatedControls = course.controls.filter(control => control.id !== id);
          
          // Renumber controls
          const renumberedControls = updatedControls.map(control => {
            if (control.type !== 'control') return control;
            
            const index = updatedControls
              .filter(c => c.type === 'control')
              .findIndex(c => c.id === control.id);
              
            return {
              ...control,
              number: index + 1,
              code: `${index + 1}`,
            };
          });
          
          return {
            ...course,
            controls: renumberedControls,
          };
        }
        return course;
      });
      
      const updatedEvent = { ...prev, courses: updatedCourses };
      
      // Update the all-controls course
      const allControls = collectAllUniqueControls(updatedEvent.courses);
      setAllControls(allControls);
      return updateAllControlsCourse(updatedEvent, allControls);
    });
    
    setSelectedControlId(null);
  }, [currentEvent, currentCourseId]);
  
  // Export course as JSON
  const exportCourse = useCallback(() => {
    if (!currentEvent || !currentCourse) {
      toast({
        title: t('exportError'),
        description: t('noCourseSelected'),
        variant: 'destructive',
      });
      return;
    }
    
    // Create a JSON representation of the course
    const courseData = {
      name: currentCourse.name,
      description: currentCourse.description,
      scale: currentCourse.scale || currentEvent.mapScale,
      controls: currentCourse.controls,
      // Calculate actual distance based on the scale and control positions
      distance: getCourseDistanceInKm(currentCourse),
      climb: currentCourse.climb || 0,
      eventName: currentEvent.name,
      eventDate: currentEvent.date,
      eventLocation: currentEvent.location,
      eventOrganizer: currentEvent.organizer,
    };
    
    // Create a downloadable blob
    const dataStr = JSON.stringify(courseData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger the download
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${currentCourse.name.replace(/\s+/g, '-').toLowerCase()}.json`);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    toast({
      title: t('exportSuccess'),
      description: `${currentCourse.name} ${t('hasBeenExported')}`,
    });
  }, [currentEvent, currentCourse, t]);

  // Save the event
  const saveEvent = useCallback(() => {
    if (!currentEvent) return;
    
    // In a real app, this would save to a database or API
    // For now, we'll just show a success message
    
    // Update course lengths if they haven't been set
    const updatedCourses = currentEvent.courses.map(course => {
      if (course.id === 'course-all-controls') return course;
      if (course.length) return course;
      
      return {
        ...course,
        length: getCourseDistanceInKm(course),
      };
    });
    
    setCurrentEvent(prev => {
      if (!prev) return null;
      return {
        ...prev,
        courses: updatedCourses,
      };
    });
    
    toast({
      title: t('eventSaved'),
      description: `${currentEvent.name} ${t('hasBeenSaved')}`,
    });
  }, [currentEvent, t]);

  // Whenever the current event changes, update the all-controls list
  React.useEffect(() => {
    if (currentEvent) {
      const controls = collectAllUniqueControls(currentEvent.courses);
      setAllControls(controls);
    } else {
      setAllControls([]);
    }
  }, [currentEvent]);

  return {
    currentEvent,
    currentCourse,
    currentCourseId,
    selectedControl,
    isEditing,
    allControls,
    createEvent,
    addCourse,
    selectCourse,
    updateCourse,
    addControl,
    updateControlPosition,
    selectControl,
    updateControlProperties,
    deleteControl,
    exportCourse,
    saveEvent,
    setIsEditing,
  };
};

export default useEventState;
