
import React, { useState } from 'react';
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

// Mock maps data
const mockMaps = [
  { id: 1, name: 'Urban Map', projectCount: 2, lastUsed: '2023-09-05' },
  { id: 2, name: 'Forest Map', projectCount: 2, lastUsed: '2023-10-12' },
  { id: 3, name: 'Park Map', projectCount: 1, lastUsed: '2023-08-10' },
];

const ProjectsView: React.FC = () => {
  const { t } = useLanguage();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  
  const handleProjectClick = (projectId: number) => {
    setSelectedProject(projectId);
    // In a real app, this would navigate to the project editor
    console.log(`Opening project ${projectId}`);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('previous.projects')}</h2>
      
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockProjects.map((project) => (
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
                  </TableRow>
                ))}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMaps.map((map) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectsView;
