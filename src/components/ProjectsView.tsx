
import React, { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Map, Calendar, FolderOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Mock project data - in a real app, this would come from a database
const mockProjects = [
  { id: 1, name: 'City Sprint', mapName: 'Urban Map', date: '2023-06-15', courses: 3 },
  { id: 2, name: 'Forest Challenge', mapName: 'Forest Map', date: '2023-07-22', courses: 2 },
  { id: 3, name: 'Park Event', mapName: 'Park Map', date: '2023-08-10', courses: 5 },
  { id: 4, name: 'Training Session', mapName: 'Urban Map', date: '2023-09-05', courses: 1 },
  { id: 5, name: 'Regional Competition', mapName: 'Forest Map', date: '2023-10-12', courses: 4 },
];

// Mock shared projects data
const mockSharedProjects = [
  { id: 6, name: 'Club Championship', mapName: 'Forest Map', date: '2023-11-05', courses: 6, sharedBy: 'Jane Smith' },
  { id: 7, name: 'Night Event', mapName: 'Urban Map', date: '2023-12-10', courses: 2, sharedBy: 'John Doe' },
  { id: 8, name: 'Winter Training', mapName: 'Park Map', date: '2024-01-15', courses: 3, sharedBy: 'Club Admin' },
];

// Mock maps data
const mockMaps = [
  { id: 1, name: 'Urban Map', projectCount: 2, lastUsed: '2023-09-05' },
  { id: 2, name: 'Forest Map', projectCount: 2, lastUsed: '2023-10-12' },
  { id: 3, name: 'Park Map', projectCount: 1, lastUsed: '2023-08-10' },
];

// Mock shared maps data
const mockSharedMaps = [
  { id: 4, name: 'Forest Map', projectCount: 1, lastUsed: '2023-11-05', sharedBy: 'Jane Smith' },
  { id: 5, name: 'Urban Map', projectCount: 1, lastUsed: '2023-12-10', sharedBy: 'John Doe' },
  { id: 6, name: 'Park Map', projectCount: 1, lastUsed: '2024-01-15', sharedBy: 'Club Admin' },
];

interface ProjectsViewProps {
  showShared?: boolean;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ showShared = false }) => {
  const { t } = useLanguage();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  
  const handleProjectClick = (projectId: number) => {
    setSelectedProject(projectId);
    // In a real app, this would navigate to the project editor
    console.log(`Opening project ${projectId}`);
  };
  
  const displayProjects = showShared ? mockSharedProjects : mockProjects;
  const displayMaps = showShared ? mockSharedMaps : mockMaps;
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="by-date" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="by-date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('by.date')}
          </TabsTrigger>
          <TabsTrigger value="by-map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            {t('by.map')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="by-date" className="rounded-lg border border-border p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('project.name')}</TableHead>
                  <TableHead>{t('map')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('courses')}</TableHead>
                  {showShared && <TableHead>{t('sharedBy')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.length > 0 ? (
                  displayProjects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-orienteering" />
                          {project.name}
                        </div>
                      </TableCell>
                      <TableCell>{project.mapName}</TableCell>
                      <TableCell>{project.date}</TableCell>
                      <TableCell>{project.courses}</TableCell>
                      {showShared && 'sharedBy' in project && (
                        <TableCell>{project.sharedBy}</TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showShared ? 5 : 4} className="text-center py-4">
                      {showShared ? t('noSharedProjects') : t('noProjects')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="by-map" className="rounded-lg border border-border p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('map.name')}</TableHead>
                  <TableHead>{t('projects')}</TableHead>
                  <TableHead>{t('last.used')}</TableHead>
                  {showShared && <TableHead>{t('sharedBy')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMaps.length > 0 ? (
                  displayMaps.map((map) => (
                    <TableRow 
                      key={map.id} 
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Map className="h-4 w-4 text-orienteering" />
                          {map.name}
                        </div>
                      </TableCell>
                      <TableCell>{map.projectCount}</TableCell>
                      <TableCell>{map.lastUsed}</TableCell>
                      {showShared && 'sharedBy' in map && (
                        <TableCell>{map.sharedBy}</TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showShared ? 4 : 3} className="text-center py-4">
                      {showShared ? t('noSharedMaps') : t('noMaps')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectsView;
