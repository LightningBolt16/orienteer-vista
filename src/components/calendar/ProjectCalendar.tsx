
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar } from '../../components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Project, ProjectCategory } from '../../types/project';
import { format } from 'date-fns';

interface ProjectCalendarProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({ projects, onSelectProject }) => {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Get projects due on the selected date
  const projectsDueOnDate = selectedDate 
    ? projects.filter(project => {
        if (!project.dueDate) return false;
        const dueDate = new Date(project.dueDate);
        return (
          dueDate.getDate() === selectedDate.getDate() &&
          dueDate.getMonth() === selectedDate.getMonth() &&
          dueDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : [];
  
  // Get all dates with projects
  const projectDates = projects
    .filter(project => project.dueDate)
    .map(project => new Date(project.dueDate!));
  
  // Check if a date has projects
  const hasProjectsOnDate = (date: Date) => {
    return projectDates.some(projectDate => 
      projectDate.getDate() === date.getDate() &&
      projectDate.getMonth() === date.getMonth() &&
      projectDate.getFullYear() === date.getFullYear()
    );
  };
  
  // Get category color for styling
  const getCategoryColor = (category: ProjectCategory): string => {
    switch (category) {
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'club':
        return 'bg-green-100 text-green-800';
      case 'national':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Render calendar day contents
  const renderDay = (day: Date) => {
    const isProjectDate = hasProjectsOnDate(day);
    
    return (
      <div className="relative h-full w-full p-2">
        <time dateTime={format(day, 'yyyy-MM-dd')}>{format(day, 'd')}</time>
        {isProjectDate && <div className="w-1.5 h-1.5 bg-primary rounded-full absolute bottom-1 right-1" />}
      </div>
    );
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="border rounded-md"
          components={{
            Day: ({ date, ...props }) => (
              <div {...props}>
                {renderDay(date)}
              </div>
            ),
          }}
        />
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate 
                ? format(selectedDate, 'MMMM d, yyyy') 
                : t('selectDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectsDueOnDate.length > 0 ? (
              <div className="space-y-4">
                {projectsDueOnDate.map(project => (
                  <div 
                    key={project.id}
                    className="p-4 border rounded-md cursor-pointer hover:bg-accent"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{project.name}</h3>
                      <Badge variant="outline" className={getCategoryColor(project.category)}>
                        {t(project.category)}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                    )}
                    {project.primaryAssignee && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('assignee')}:</span> {project.primaryAssignee}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('noProjectsDue')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectCalendar;
