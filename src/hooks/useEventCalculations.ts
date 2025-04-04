
import { Control, Course, Event } from './useEventState';

// Calculate distance between two control points
export const calculateDistance = (controlA: Control, controlB: Control): number => {
  const dx = controlA.x - controlB.x;
  const dy = controlA.y - controlB.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Find the shortest path that visits all controls using nearest neighbor algorithm
export const findShortestPath = (controls: Control[]): Control[] => {
  if (controls.length <= 1) return controls;

  const visited = new Set<string>();
  const path: Control[] = [];
  
  // Start with the top-left most control as a simple heuristic
  let currentControl = controls.reduce((min, control) => 
    control.x + control.y < min.x + min.y ? control : min, controls[0]);
  
  path.push(currentControl);
  visited.add(currentControl.id);
  
  // Find the nearest unvisited control and add it to the path
  while (visited.size < controls.length) {
    let nearestControl: Control | null = null;
    let minDistance = Infinity;
    
    for (const control of controls) {
      if (!visited.has(control.id)) {
        const distance = calculateDistance(currentControl, control);
        if (distance < minDistance) {
          minDistance = distance;
          nearestControl = control;
        }
      }
    }
    
    if (nearestControl) {
      path.push(nearestControl);
      visited.add(nearestControl.id);
      currentControl = nearestControl;
    } else {
      // All controls have been visited
      break;
    }
  }
  
  return path;
}

// Helper function to collect all unique controls from all courses
export const collectAllUniqueControls = (courses: Course[]): Control[] => {
  const controls: Control[] = [];
  courses.forEach(course => {
    if (course.id === 'course-all-controls') return; // Skip all-controls course as it's derived
    
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
  return controls;
};

// Helper function to update the all-controls course with the optimized path
export const updateAllControlsCourse = (event: Event, allControls: Control[]): Event => {
  if (allControls.length === 0) return event;
  
  const allControlsCourseIndex = event.courses.findIndex(c => c.id === 'course-all-controls');
  
  if (allControlsCourseIndex === -1) return event;
  
  // Get path optimized controls
  const sortedControls = findShortestPath(allControls);
  
  // Update the all-controls course with the optimized path
  const updatedCourses = [...event.courses];
  updatedCourses[allControlsCourseIndex] = {
    ...updatedCourses[allControlsCourseIndex],
    controls: sortedControls
  };
  
  return {
    ...event,
    courses: updatedCourses
  };
};
