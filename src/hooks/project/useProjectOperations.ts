
import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { toast } from '../../components/ui/use-toast';
import { Project, Permission, ProjectCategory, DEFAULT_SHARING } from '../../types/project';

// For demo purposes, we'll simulate a current user - in a real app, this would come from auth
const CURRENT_USER = {
  id: 'user-1',
  email: 'current.user@example.com',
  name: 'Current User'
};

export function useProjectOperations(
  projects: Project[],
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  t: (key: string) => string
) {
  // Create a new project
  const createProject = useCallback((
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'shares'>
  ) => {
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
  }, [t, setProjects]);
  
  // Share a project with a user
  const shareProject = useCallback((
    projectId: string, 
    userEmail: string, 
    userName: string | undefined, 
    permission: Permission
  ) => {
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
  }, [t, setProjects]);
  
  // Update project permissions
  const updatePermission = useCallback((
    projectId: string, 
    shareId: string, 
    newPermission: Permission
  ) => {
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
  }, [t, setProjects]);
  
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
  }, [t, setProjects]);
  
  // Get default sharing permission for a category
  const getDefaultPermission = useCallback((category: ProjectCategory): Permission => {
    return DEFAULT_SHARING[category];
  }, []);

  return {
    createProject,
    shareProject,
    updatePermission,
    removeShare,
    getDefaultPermission
  };
}
