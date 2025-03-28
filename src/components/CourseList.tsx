
import React from 'react';
import { Button } from './ui/button';
import { FileText } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  controls: any[];
  description: string;
}

interface CourseListProps {
  courses: Course[];
  activeCourseId: string | undefined;
  onSelectCourse: (courseId: string) => void;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  activeCourseId,
  onSelectCourse
}) => {
  if (courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No courses yet. Create your first course.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {courses.map(course => (
        <Button 
          key={course.id}
          variant={activeCourseId === course.id ? "default" : "outline"}
          className="w-full justify-start text-left"
          onClick={() => onSelectCourse(course.id)}
        >
          <FileText className="h-4 w-4 mr-2" />
          <div className="truncate">
            {course.name}
            <div className="text-xs opacity-70">
              {course.controls.length} controls
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
};

export default CourseList;
