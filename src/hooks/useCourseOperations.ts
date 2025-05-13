
import { toast } from '../components/ui/use-toast';
import { Course, Event, generateNewCourseId } from '../types/event';
import { useLanguage } from '../context/LanguageContext';

export function useCourseOperations(
  currentEvent: Event | null,
  setEvent: React.Dispatch<React.SetStateAction<Event | null>>,
  setCurrentCourseId: React.Dispatch<React.SetStateAction<string | null>>,
  setSelectedControlId: React.Dispatch<React.SetStateAction<string | null>>
) {
  const { t } = useLanguage();

  // Add a new course
  const addCourse = () => {
    if (!currentEvent) return;
    
    const newCourseId = generateNewCourseId();
    const courseNumber = currentEvent.courses.length;
    
    const newCourse: Course = {
      id: newCourseId,
      name: `${t('course')} ${courseNumber}`,
      description: '',
      controls: [],
    };
    
    setEvent(prev => {
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
  };

  // Select a course
  const selectCourse = (courseId: string) => {
    setCurrentCourseId(courseId);
    setSelectedControlId(null);
  };

  // Update course
  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    if (!currentEvent) return;
    
    setEvent(prev => {
      if (!prev) return null;
      
      const updatedCourses = prev.courses.map(course => {
        if (course.id === courseId) {
          return { ...course, ...updates };
        }
        return course;
      });
      
      return { ...prev, courses: updatedCourses };
    });
  };

  return {
    addCourse,
    selectCourse,
    updateCourse
  };
}
