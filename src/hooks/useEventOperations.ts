
import { toast } from '../components/ui/use-toast';
import { Event, generateNewEventId } from '../types/event';
import { useLanguage } from '../context/LanguageContext';
import { getCourseDistanceInKm } from './useEventSelectors';

export function useEventOperations(
  currentEvent: Event | null,
  currentCourseId: string | null,
  setEvent: React.Dispatch<React.SetStateAction<Event | null>>,
  setCurrentCourseId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { t } = useLanguage();
  
  // Create a new event
  const createEvent = (eventData: Omit<Event, 'id' | 'courses'>) => {
    const newEventId = generateNewEventId();
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
          id: generateNewCourseId(),
          name: t('defaultCourseName'),
          description: '',
          controls: [],
        },
      ],
    };
    
    setEvent(newEvent);
    setCurrentCourseId(newEvent.courses[1].id); // Select the default course, not all-controls
    setIsEditing(true);
  };
  
  // Export course as JSON
  const exportCourse = (currentCourse: Course | null) => {
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
  };
  
  // Save the event
  const saveEvent = () => {
    if (!currentEvent) return;
    
    // Update course lengths if they haven't been set
    const updatedCourses = currentEvent.courses.map(course => {
      if (course.id === 'course-all-controls') return course;
      if (course.length) return course;
      
      return {
        ...course,
        length: getCourseDistanceInKm(course),
      };
    });
    
    setEvent(prev => {
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
  };

  return {
    createEvent,
    exportCourse,
    saveEvent
  };
}
