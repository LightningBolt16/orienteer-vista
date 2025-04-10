
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Share2, Calendar, FilterIcon, Plus, Edit3 } from 'lucide-react';
import { Project, ProjectCategory, Permission } from '../types/project';
import useProjectSharing from '../hooks/useProjectSharing';
import ProjectShareDialog from '../components/sharing/ProjectShareDialog';
import ProjectSharingList from '../components/sharing/ProjectSharingList';
import ProjectCalendar from '../components/calendar/ProjectCalendar';
import MapSharedList from '../components/sharing/MapSharedList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const ProjectManager: React.FC = () => {
  const { t } = useLanguage();
  const {
    projects,
    selectedCategories,
    setSelectedCategories,
    createProject,
    shareProject,
    updatePermission,
    removeShare,
    getDefaultPermission
  } = useProjectSharing();
  
  const [activeTab, setActiveTab] = useState('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mapSectionOpen, setMapSectionOpen] = useState(false);
  
  // Form state for creating a new project
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<ProjectCategory>('training');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  
  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
    }
  };
  
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      return;
    }
    
    createProject({
      name: newProjectName,
      description: newProjectDescription,
      category: newProjectCategory,
      dueDate: newProjectDueDate,
    });
    
    // Reset form
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectCategory('training');
    setNewProjectDueDate('');
    
    // Close dialog
    setCreateDialogOpen(false);
  };
  
  const toggleCategory = (category: ProjectCategory | 'all') => {
    if (category === 'all') {
      // If 'all' is selected, toggle between all categories selected or none
      if (selectedCategories.length === 4) { // 4 is the number of actual categories
        setSelectedCategories([]);
      } else {
        setSelectedCategories(['training', 'club', 'national', 'other']);
      }
    } else {
      setSelectedCategories(prev => {
        if (prev.includes(category)) {
          return prev.filter(c => c !== category);
        } else {
          return [...prev, category];
        }
      });
    }
  };
  
  // Fix: Remove the second parameter which was causing the TS error
  const renderCategoryBadge = (category: ProjectCategory) => {
    const styles = {
      training: 'bg-blue-100 text-blue-800',
      club: 'bg-green-100 text-green-800',
      national: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category]}`}>
        {t(category)}
      </span>
    );
  };
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };
  
  return (
    <div className="pb-20 mx-auto max-w-7xl">
      <div className="flex items-center justify-between mt-8 mb-4">
        <h1 className="text-2xl font-bold">{t('projectManager')}</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FilterIcon className="h-4 w-4 mr-2" />
                {selectedCategories.length === 0 
                  ? t('noCategories')
                  : selectedCategories.length === 4
                  ? t('allCategories')
                  : t('selectedCategories', { count: selectedCategories.length })}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem 
                checked={selectedCategories.length === 4}
                onCheckedChange={() => toggleCategory('all')}
              >
                {t('allCategories')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={selectedCategories.includes('training')}
                onCheckedChange={() => toggleCategory('training')}
              >
                {t('training')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={selectedCategories.includes('club')}
                onCheckedChange={() => toggleCategory('club')}
              >
                {t('club')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={selectedCategories.includes('national')}
                onCheckedChange={() => toggleCategory('national')}
              >
                {t('national')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={selectedCategories.includes('other')}
                onCheckedChange={() => toggleCategory('other')}
              >
                {t('other')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => setMapSectionOpen(true)}>
            Maps Shared With Me
          </Button>
          
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('newProject')}
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="list">{t('projectsList')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('calendar')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <Card key={project.id} className={project.id === selectedProject?.id ? 'border-primary' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {renderCategoryBadge(project.category)}
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.dueDate && (
                      <div className="text-sm mb-3">
                        <span className="text-muted-foreground">{t('dueDate')}:</span> {formatDate(project.dueDate)}
                      </div>
                    )}
                    
                    <div className="space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setShareDialogOpen(true);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {t('share')}
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </Button>
                    </div>
                    
                    {project.shares.length > 0 && (
                      <div className="mt-4 text-sm">
                        <div className="text-muted-foreground mb-1">{t('sharedWith')}:</div>
                        <div className="flex flex-wrap gap-1">
                          {project.shares.map(share => (
                            <div key={share.id} className="bg-secondary rounded-full px-2 py-0.5 text-xs">
                              {share.userName || share.userEmail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <h3 className="text-lg font-medium mb-2">{t('noProjects')}</h3>
              <p className="text-muted-foreground mb-4">{t('createYourFirstProject')}</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('createProject')}
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>{t('projectCalendar')}</CardTitle>
              <CardDescription>{t('viewUpcomingDeadlines')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectCalendar projects={projects} onSelectProject={handleSelectProject} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Project sharing dialog */}
      {selectedProject && (
        <>
          <ProjectShareDialog
            project={selectedProject}
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            onShare={shareProject}
          />
          
          <Dialog open={selectedProject !== null && !shareDialogOpen} onOpenChange={() => setSelectedProject(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedProject.name}</DialogTitle>
                <DialogDescription>
                  {selectedProject.description || t('noDescription')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="mb-4">
                  <h3 className="font-medium mb-2">{t('projectDetails')}</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">{t('category')}:</span> {t(selectedProject.category)}</div>
                    {selectedProject.dueDate && (
                      <div><span className="text-muted-foreground">{t('dueDate')}:</span> {formatDate(selectedProject.dueDate)}</div>
                    )}
                    {selectedProject.primaryAssignee && (
                      <div><span className="text-muted-foreground">{t('assignee')}:</span> {selectedProject.primaryAssignee}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{t('sharedWith')}</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShareDialogOpen(true)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {t('share')}
                    </Button>
                  </div>
                  
                  <ProjectSharingList
                    project={selectedProject}
                    onUpdatePermission={updatePermission}
                    onRemoveShare={removeShare}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      
      {/* Maps Shared With Me Dialog */}
      <Dialog open={mapSectionOpen} onOpenChange={setMapSectionOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Maps Shared With Me</DialogTitle>
            <DialogDescription>
              Maps that have been shared with you by other users
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <MapSharedList />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create project dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewProject')}</DialogTitle>
            <DialogDescription>
              {t('fillProjectDetails')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">{t('projectName')} *</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('enterProjectName')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-description">{t('description')}</Label>
              <Input
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder={t('enterDescription')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-category">{t('category')} *</Label>
              <Select
                value={newProjectCategory}
                onValueChange={(value) => setNewProjectCategory(value as ProjectCategory)}
              >
                <SelectTrigger id="project-category">
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">{t('training')}</SelectItem>
                  <SelectItem value="club">{t('club')}</SelectItem>
                  <SelectItem value="national">{t('national')}</SelectItem>
                  <SelectItem value="other">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-due-date">{t('dueDate')}</Label>
              <Input
                id="project-due-date"
                type="date"
                value={newProjectDueDate}
                onChange={(e) => setNewProjectDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateProject}>
              {t('createProject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManager;
