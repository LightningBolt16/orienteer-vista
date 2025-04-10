
import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from '../components/ui/use-toast';
import { Project, ProjectShare, Permission, ProjectCategory, DEFAULT_SHARING } from '../types/project';
import { useLanguage } from '../context/LanguageContext';

// For demo purposes, we'll simulate a current user - in a real app, this would come from auth
const CURRENT_USER = {
  id: 'user-1',
  email: 'current.user@example.com',
  name: 'Current User'
};

export const useProjectSharing = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredCategory, setFilteredCategory] = useState<ProjectCategory | 'all'>('all');
  
  // Load sample projects on mount (in a real app, this would come from an API/database)
  useEffect(() => {
    // Sample data for demonstration
    const sampleProjects: Project[] = [
      {
        id: 'project-1',
        name: 'Club Championship 2025',
        description: 'Annual club championship event',
        createdAt: '2025-03-15T10:00:00Z',
        updatedAt: '2025-03-25T14:30:00Z',
        createdBy: CURRENT_USER.id,
        dueDate: '2025-07-15T09:00:00Z',
        category: 'club',
        primaryAssignee: CURRENT_USER.id,
        shares: [
          {
            id: 'share-1',
            userEmail: 'teammate@example.com',
            userName: 'Team Member',
            permission: 'edit',
            dateAdded: '2025-03-16T08:20:00Z'
          }
        ]
      },
      {
        id: 'project-2',
        name: 'Weekly Training Session',
        description: 'Regular Thursday training',
        createdAt: '2025-04-01T09:00:00Z',
        updatedAt: '2025-04-02T11:30:00Z',
        createdBy: CURRENT_USER.id,
        dueDate: '2025-04-18T18:00:00Z',
        category: 'training',
        shares: []
      },
      {
        id: 'project-3',
        name: 'National Championship 2025',
        description: 'Support for the national event',
        createdAt: '2025-02-10T13:45:00Z',
        updatedAt: '2025-03-20T16:15:00Z',
        createdBy: 'user-2',
        dueDate: '2025-08-30T08:00:00Z',
        category: 'national',
        primaryAssignee: 'user-2',
        shares: [
          {
            id: 'share-2',
            userEmail: CURRENT_USER.email,
            userName: CURRENT_USER.name,
            permission: 'view',
            dateAdded: '2025-02-12T10:30:00Z'
          }
        ]
      }
    ];
    
    setProjects(sampleProjects);
  }, []);
  
  // Filter projects by category
  const filteredProjects = useCallback(() => {
    if (filteredCategory === 'all') {
      return projects;
    }
    return projects.filter(project => project.category === filteredCategory);
  }, [projects, filteredCategory]);
  
  // Create a new project
  const createProject = useCallback((projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'shares'>) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `project-${nanoid()}`,
      ...projectData,
      createdAt: now,
      updatedAt: now,
      createdBy: CURRENT_USER.id,
      shares: []
    };
    
    setProjects(prev => [...prev, newProject]);
    
    toast({
      title: t('projectCreated'),
      description: `${newProject.name} ${t('hasBeenCreated')}`
    });
    
    return newProject;
  }, [t]);
  
  // Share a project with a user
  const shareProject = useCallback((projectId: string, userEmail: string, userName: string | undefined, permission: Permission) => {
    setProjects(prev => {
      const updated = prev.map(project => {
        if (project.id === projectId) {
          // Check if the user already has access
          const existingShareIndex = project.shares.findIndex(
            share => share.userEmail === userEmail
          );
          
          let updatedShares = [...project.shares];
          
          if (existingShareIndex >= 0) {
            // Update existing share
            updatedShares[existingShareIndex] = {
              ...updatedShares[existingShareIndex],
              permission,
              userName
            };
          } else {
            // Add new share
            updatedShares.push({
              id: `share-${nanoid()}`,
              userEmail,
              userName,
              permission,
              dateAdded: new Date().toISOString()
            });
          }
          
          return {
            ...project,
            updatedAt: new Date().toISOString(),
            shares: updatedShares
          };
        }
        return project;
      });
      
      return updated;
    });
    
    toast({
      title: t('projectShared'),
      description: `${t('projectSharedWith')} ${userEmail}`
    });
  }, [t]);
  
  // Update project permissions
  const updatePermission = useCallback((projectId: string, shareId: string, newPermission: Permission) => {
    setProjects(prev => {
      const updated = prev.map(project => {
        if (project.id === projectId) {
          const updatedShares = project.shares.map(share => {
            if (share.id === shareId) {
              return { ...share, permission: newPermission };
            }
            return share;
          });
          
          return {
            ...project,
            updatedAt: new Date().toISOString(),
            shares: updatedShares
          };
        }
        return project;
      });
      
      return updated;
    });
    
    toast({
      title: t('permissionUpdated'),
      description: t('sharingPermissionUpdated')
    });
  }, [t]);
  
  // Remove a share
  const removeShare = useCallback((projectId: string, shareId: string) => {
    setProjects(prev => {
      const updated = prev.map(project => {
        if (project.id === projectId) {
          const updatedShares = project.shares.filter(share => share.id !== shareId);
          
          return {
            ...project,
            updatedAt: new Date().toISOString(),
            shares: updatedShares
          };
        }
        return project;
      });
      
      return updated;
    });
    
    toast({
      title: t('accessRemoved'),
      description: t('userAccessRemoved')
    });
  }, [t]);
  
  // Get default sharing permission for a category
  const getDefaultPermission = useCallback((category: ProjectCategory): Permission => {
    return DEFAULT_SHARING[category];
  }, []);
  
  return {
    projects: filteredProjects(),
    filteredCategory,
    setFilteredCategory,
    createProject,
    shareProject,
    updatePermission,
    removeShare,
    getDefaultPermission
  };
};

export default useProjectSharing;
