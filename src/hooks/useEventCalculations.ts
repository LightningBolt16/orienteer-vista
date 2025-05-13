
import { Control, Course, Event } from '../types/event';

// Utility functions for event calculations

// Update all-controls course in the event
export function updateAllControlsCourse(event: Event, allControls: Control[]): Event {
  const updatedCourses = event.courses.map(course => {
    if (course.id === 'course-all-controls') {
      return {
        ...course,
        controls: allControls
      };
    }
    return course;
  });
  
  return {
    ...event,
    courses: updatedCourses
  };
}

// Collect all unique controls from all courses
export function collectAllUniqueControls(courses: Course[]): Control[] {
  // Skip the all-controls course itself
  const regularCourses = courses.filter(course => course.id !== 'course-all-controls');
  
  // Collect all controls
  const allControlsMap = new Map<string, Control>();
  
  regularCourses.forEach(course => {
    course.controls.forEach(control => {
      // Use control coordinates as a unique key to avoid duplicates
      const key = `${control.x}-${control.y}-${control.type}`;
      allControlsMap.set(key, control);
    });
  });
  
  // Convert map back to array
  return Array.from(allControlsMap.values());
}

// Calculate the distance between two controls in km
export function calculateDistanceBetweenControls(
  control1: Control,
  control2: Control,
  scale: string
): number {
  const scaleValue = parseInt(scale, 10);
  if (!scaleValue) return 0;
  
  // Calculate pixel distance
  const pixelDistance = Math.sqrt(
    Math.pow(control2.x - control1.x, 2) + Math.pow(control2.y - control1.y, 2)
  );
  
  // Convert pixel distance to kilometers
  // Assuming 1 km in real world = 1000 / scaleValue pixels on the map
  return pixelDistance * scaleValue / 1000;
}

// Calculate the distance in km for a course
export function calculateCourseDistance(course: Course, scale: string): number {
  const controls = course.controls;
  if (!controls || controls.length < 2) return 0;
  
  // Calculate the total distance by summing distances between consecutive controls
  let totalDistance = 0;
  const orderedControls = [...controls]
    .filter(c => ['control', 'start', 'finish'].includes(c.type))
    .sort((a, b) => {
      if (a.type === 'start') return -1;
      if (b.type === 'start') return 1;
      if (a.type === 'finish') return 1;
      if (b.type === 'finish') return -1;
      return (a.number || 0) - (b.number || 0);
    });
  
  for (let i = 0; i < orderedControls.length - 1; i++) {
    totalDistance += calculateDistanceBetweenControls(
      orderedControls[i],
      orderedControls[i + 1],
      scale
    );
  }
  
  return totalDistance;
}
