
import React from 'react';
import { Course } from '../../../types/event';
import CourseEditor from '../CourseEditor';
import { Button } from '../../ui/button';
import { ChevronLeft } from 'lucide-react';

interface CourseEditorPanelProps {
  currentCourse: Course | null;
  courses: Course[];
  mapType: 'sprint' | 'forest';
  mapScale: string;
  isCourseEditorCollapsed: boolean;
  onSelectCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onAddCourse: () => void;
  onToggleCourseEditorCollapsed: () => void;
}

const CourseEditorPanel: React.FC<CourseEditorPanelProps> = ({
  currentCourse,
  courses,
  mapType,
  mapScale,
  isCourseEditorCollapsed,
  onSelectCourse,
  onUpdateCourse,
  onAddCourse,
  onToggleCourseEditorCollapsed
}) => {
  if (isCourseEditorCollapsed || !currentCourse) {
    return null;
  }
  
  return (
    <div className="flex h-full">
      <CourseEditor
        currentCourse={currentCourse}
        courses={courses}
        mapType={mapType}
        mapScale={mapScale}
        onSelectCourse={onSelectCourse}
        onUpdateCourse={onUpdateCourse}
        onAddCourse={onAddCourse}
      />
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 self-start mt-2 ml-1"
        onClick={onToggleCourseEditorCollapsed}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CourseEditorPanel;
