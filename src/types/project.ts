
// Defines types for the sharing platform and project management

export type Permission = 'view' | 'edit' | 'suggest';

export interface ProjectShare {
  id: string;
  userEmail: string;
  userName?: string;
  permission: Permission;
  dateAdded: string;
}

export type ProjectCategory = 'training' | 'club' | 'national' | 'other';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  dueDate?: string;
  category: ProjectCategory;
  primaryAssignee?: string;
  shares: ProjectShare[];
  // Indicates if this is the current active project
  isActive?: boolean;
}

// Default sharing for each category
export const DEFAULT_SHARING: Record<ProjectCategory, Permission> = {
  training: 'edit',
  club: 'suggest',
  national: 'view',
  other: 'view'
};
