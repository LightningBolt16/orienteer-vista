
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { Control, Course, Event, MapInfo } from '../types/event';
import { useLanguage } from '../context/LanguageContext';
import { updateAllControlsCourse, collectAllUniqueControls } from './useEventCalculations';
import { getCourseDistanceInKm } from './useEventSelectors';
import { useControlOperations } from './useControlOperations';
import { useCourseOperations } from './useCourseOperations';
import { useEventOperations } from './useEventOperations';

// Changed from default to named export (to match how we import in CourseSetter.tsx)
export const useEventState = () => {
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
  
  // Import operations from separate hooks
  const courseOperations = useCourseOperations(
    currentEvent, 
    setCurrentEvent,
    setCurrentCourseId,
    setSelectedControlId
  );
  
  const controlOperations = useControlOperations(
    currentEvent,
    currentCourseId,
    setCurrentEvent,
    setSelectedControlId,
    updateAllControlsCourse,
    collectAllUniqueControls,
    setAllControls
  );
  
  const eventOperations = useEventOperations(
    currentEvent,
    currentCourseId,
    setCurrentEvent,
    setCurrentCourseId,
    setIsEditing
  );

  // Whenever the current event changes, update the all-controls list
  useEffect(() => {
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
    createEvent: eventOperations.createEvent,
    addCourse: courseOperations.addCourse,
    selectCourse: courseOperations.selectCourse,
    updateCourse: courseOperations.updateCourse,
    addControl: controlOperations.addControl,
    updateControlPosition: controlOperations.updateControlPosition,
    selectControl: controlOperations.selectControl,
    updateControlProperties: controlOperations.updateControlProperties,
    deleteControl: controlOperations.deleteControl,
    exportCourse: () => eventOperations.exportCourse(currentCourse),
    saveEvent: eventOperations.saveEvent,
    setIsEditing,
  };
};

// Add this default export to maintain compatibility with both import styles
export default useEventState;
