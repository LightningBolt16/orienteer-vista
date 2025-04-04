
import { Course, Control, Event } from './useEventState';

/**
 * Helper functions for selecting and deriving data from event state
 */

// Get the current course by ID
export const getCurrentCourse = (event: Event, courseId: string | null): Course | null => {
  if (!courseId) return null;
  return event.courses.find(course => course.id === courseId) || null;
};

// Get a specific control by ID
export const getControlById = (courses: Course[], controlId: string | null): Control | null => {
  if (!controlId) return null;
  
  for (const course of courses) {
    const control = course.controls.find(control => control.id === controlId);
    if (control) return control;
  }
  
  return null;
};

// Get the total course length in kilometers
export const getCourseDistanceInKm = (course: Course): number => {
  if (!course || course.controls.length < 2) return 0;
  
  let totalDistance = 0;
  const sortedControls = [...course.controls]
    .filter(c => c.type === 'control' || c.type === 'start' || c.type === 'finish')
    .sort((a, b) => {
      if (a.type === 'start') return -1;
      if (b.type === 'start') return 1;
      if (a.type === 'finish') return 1;
      if (b.type === 'finish') return -1;
      return (a.number || 0) - (b.number || 0);
    });
  
  // Calculate distance between consecutive controls
  for (let i = 0; i < sortedControls.length - 1; i++) {
    const control1 = sortedControls[i];
    const control2 = sortedControls[i + 1];
    
    const dx = control1.x - control2.x;
    const dy = control1.y - control2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Convert to km based on map scale (simplified approach)
    totalDistance += distance;
  }
  
  return parseFloat((totalDistance / 1000).toFixed(2));
};

// Count controls by type
export const countControlsByType = (course: Course) => {
  return course.controls.reduce((counts, control) => {
    counts[control.type] = (counts[control.type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
};
