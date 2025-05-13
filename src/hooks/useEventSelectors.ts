
import { Course } from '../types/event';
import { calculateCourseDistance } from './useEventCalculations';

// Selectors for event state

// Get the course distance in kilometers
export function getCourseDistanceInKm(course: Course): number {
  if (!course) return 0;
  
  // Use the course scale if available, otherwise use a default
  const scale = course.scale || '10000';
  
  return calculateCourseDistance(course, scale);
}
