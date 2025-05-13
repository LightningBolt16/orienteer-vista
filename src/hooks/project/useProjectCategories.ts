
import { useState, useCallback } from 'react';
import { Project, ProjectCategory } from '../../types/project';

export function useProjectCategories(projects: Project[]) {
  const [selectedCategories, setSelectedCategories] = useState<ProjectCategory[]>([
    'training', 'club', 'national', 'other'
  ]);
  
  // Filter projects by selected categories
  const filteredProjects = useCallback((categories: ProjectCategory[]) => {
    if (categories.length === 0) {
      return [];
    }
    return projects.filter(project => categories.includes(project.category));
  }, [projects]);

  return {
    selectedCategories,
    setSelectedCategories,
    filteredProjects
  };
}
