
import { useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';

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
  controls: Control[];
  description: string;
  length?: number;
  climb?: number;
  scale?: string;
}

export interface Event {
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

export interface MapInfo {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
  scale: string;
}

// Calculate distance between two control points
const calculateDistance = (controlA: Control, controlB: Control): number => {
  const dx = controlA.x - controlB.x;
  const dy = controlA.y - controlB.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Find the shortest path that visits all controls using nearest neighbor algorithm
const findShortestPath = (controls: Control[]): Control[] => {
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

export function useEventState() {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Update all controls when any course changes
  useEffect(() => {
    if (currentEvent) {
      // Collect all controls from all courses
      const controls: Control[] = [];
      currentEvent.courses.forEach(course => {
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
      setAllControls(controls);
      
      // Update the all-controls course with the shortest path
      if (controls.length > 0) {
        const allControlsCourseIndex = currentEvent.courses.findIndex(c => c.id === 'course-all-controls');
        
        if (allControlsCourseIndex !== -1) {
          // Get path optimized controls
          const sortedControls = findShortestPath(controls);
          
          // Update the all-controls course with the optimized path
          const updatedCourses = [...currentEvent.courses];
          updatedCourses[allControlsCourseIndex] = {
            ...updatedCourses[allControlsCourseIndex],
            controls: sortedControls
          };
          
          setCurrentEvent({
            ...currentEvent,
            courses: updatedCourses
          });
          
          // Update current course if it's the all-controls course
          if (currentCourse?.id === 'course-all-controls') {
            setCurrentCourse({
              ...currentCourse,
              controls: sortedControls
            });
          }
        }
      }
    }
  }, [currentEvent?.courses]);

  // Function to create a new event
  const createEvent = (name: string, mapId: string, mapScale: string, mapType: 'sprint' | 'forest', date: string) => {
    if (!name || !mapId) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }
    
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      name,
      mapId,
      mapScale,
      mapType,
      date: date || new Date().toISOString().split('T')[0],
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
      scale: mapScale
    };
    
    newEvent.courses.push(allControlsCourse);
    
    setCurrentEvent(newEvent);
    setCurrentCourse(allControlsCourse);
    setIsEditing(true);
    
    toast({
      title: "Success",
      description: "Event created successfully",
    });
  };
  
  // Function to add a new course to the current event
  const addCourse = () => {
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
  const addControl = (newControl: Control) => {
    if (!currentCourse || !currentEvent || currentCourse.id === 'course-all-controls') return;
    
    const updatedControls = [...currentCourse.controls, newControl];
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    
    // Update current course
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    const updatedCourses = currentEvent.courses.map(course => 
      course.id === currentCourse.id ? updatedCourse : course
    );
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
  };
  
  // Function to update control position (for drag and drop)
  const updateControlPosition = (controlId: string, x: number, y: number) => {
    if (!currentCourse || !currentEvent || currentCourse.id === 'course-all-controls') return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, x, y } : control
    );
    
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    const updatedCourses = currentEvent.courses.map(course => {
      if (course.id === currentCourse.id) {
        return updatedCourse;
      }
      return course;
    });
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
  };
  
  // Function to delete a control
  const deleteControl = (controlId: string) => {
    if (!currentCourse || !currentEvent || currentCourse.id === 'course-all-controls') return;
    
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
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
    
    setSelectedControl(null);
    
    toast({
      title: "Success",
      description: "Control deleted successfully",
    });
  };
  
  // Function to update control properties
  const updateControlProperties = (controlId: string, updates: Partial<Control>) => {
    if (!currentCourse || !currentEvent || currentCourse.id === 'course-all-controls') return;
    
    const updatedControls = currentCourse.controls.map(control => 
      control.id === controlId ? { ...control, ...updates } : control
    );
    
    const updatedCourse = { ...currentCourse, controls: updatedControls };
    setCurrentCourse(updatedCourse);
    
    // Also update the course in the current event
    const updatedCourses = currentEvent.courses.map(course => 
      course.id === currentCourse.id ? updatedCourse : course
    );
    
    setCurrentEvent({
      ...currentEvent,
      courses: updatedCourses
    });
    
    // Update selected control if it's the one being edited
    if (selectedControl && selectedControl.id === controlId) {
      setSelectedControl({ ...selectedControl, ...updates });
    }
  };
  
  // Function to update course details
  const updateCourse = (courseId: string, updates: Partial<Course>) => {
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
  
  // Function to select a different course to edit
  const selectCourse = (courseId: string) => {
    if (!currentEvent) return;
    
    const selected = currentEvent.courses.find(course => course.id === courseId);
    if (selected) {
      setCurrentCourse(selected);
      setSelectedControl(null); // Reset selected control when changing course
    }
  };
  
  // Function to save event (would connect to backend in a real implementation)
  const saveEvent = () => {
    if (!currentEvent) return;
    
    console.log('Saving event:', currentEvent);
    toast({
      title: "Success",
      description: "Changes saved successfully",
    });
  };
  
  // Function to handle control selection
  const selectControl = (control: Control) => {
    setSelectedControl(control);
  };
  
  // Function to export the current course
  const exportCourse = () => {
    if (!currentCourse) return;
    
    // In a real implementation, this would generate a file for export
    console.log('Exporting course:', currentCourse);
    toast({
      title: "Success",
      description: "Course exported successfully",
    });
  };

  return {
    currentEvent,
    currentCourse,
    selectedControl,
    allControls,
    isEditing,
    setIsEditing,
    setCurrentEvent,
    createEvent,
    addCourse,
    addControl,
    updateControlPosition,
    deleteControl,
    updateControlProperties,
    updateCourse,
    selectCourse,
    saveEvent,
    selectControl,
    exportCourse
  };
}
