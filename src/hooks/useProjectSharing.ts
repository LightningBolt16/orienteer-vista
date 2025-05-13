
import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from '../components/ui/use-toast';
import { Project, ProjectShare, Permission, ProjectCategory, DEFAULT_SHARING } from '../types/project';
import { useLanguage } from '../context/LanguageContext';
import { useProjectOperations } from './project/useProjectOperations';
import { useProjectCategories } from './project/useProjectCategories';

// For demo purposes, we'll simulate a current user - in a real app, this would come from auth
const CURRENT_USER = {
  id: 'user-1',
  email: 'current.user@example.com',
  name: 'Current User'
};

export const useProjectSharing = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Extract category management to a separate hook
  const { 
    selectedCategories, 
    setSelectedCategories,
    filteredProjects
  } = useProjectCategories(projects);
  
  // Extract project operations to a separate hook
  const { 
    createProject, 
    shareProject, 
    updatePermission, 
    removeShare,
    getDefaultPermission
  } = useProjectOperations(projects, setProjects, t);
  
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

  return {
    projects: filteredProjects(selectedCategories),
    selectedCategories,
    setSelectedCategories,
    createProject,
    shareProject,
    updatePermission,
    removeShare,
    getDefaultPermission
  };
};

export default useProjectSharing;
