
import { toast } from '../components/ui/use-toast';
import { Control, Event, generateNewControlId } from '../types/event';
import { useLanguage } from '../context/LanguageContext';

export function useControlOperations(
  currentEvent: Event | null,
  currentCourseId: string | null,
  setEvent: React.Dispatch<React.SetStateAction<Event | null>>,
  setSelectedControlId: React.Dispatch<React.SetStateAction<string | null>>,
  updateAllControlsInEvent: (event: Event, allControls: Control[]) => Event,
  collectAllUniqueControls: (courses: Event['courses']) => Control[],
  setAllControls: React.Dispatch<React.SetStateAction<Control[]>>
) {
  const { t } = useLanguage();

  // Add control to course
  const addControl = (control: Control) => {
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
    
    // Check if adding a start control when one already exists
    if (control.type === 'start') {
      const currentCourse = currentEvent.courses.find(course => course.id === currentCourseId);
      if (currentCourse && currentCourse.controls.some(c => c.type === 'start')) {
        toast({
          title: "Only one start allowed",
          description: "A course can only have one start point. Delete the existing one first.",
          variant: "destructive"
        });
        return;
      }
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
      id: generateNewControlId(),
      number: control.type === 'control' ? controlNumber : undefined,
      code: control.type === 'control' ? `${controlNumber}` : undefined,
    };
    
    setEvent(prev => {
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
      return updateAllControlsInEvent(updatedEvent, allControls);
    });
    
    setSelectedControlId(newControl.id);
  };

  // Update control position
  const updateControlPosition = (id: string, x: number, y: number) => {
    if (!currentEvent) return;
    
    setEvent(prev => {
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
      return updateAllControlsInEvent(updatedEvent, allControls);
    });
  };

  // Select a control
  const selectControl = (control: Control) => {
    setSelectedControlId(control.id);
  };

  // Update control properties
  const updateControlProperties = (id: string, updates: Partial<Control>) => {
    if (!currentEvent) return;
    
    setEvent(prev => {
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
  };

  // Delete a control
  const deleteControl = (id: string) => {
    if (!currentEvent || !currentCourseId) return;
    
    setEvent(prev => {
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
      return updateAllControlsInEvent(updatedEvent, allControls);
    });
    
    setSelectedControlId(null);
  };

  return {
    addControl,
    updateControlPosition,
    selectControl,
    updateControlProperties,
    deleteControl
  };
}
