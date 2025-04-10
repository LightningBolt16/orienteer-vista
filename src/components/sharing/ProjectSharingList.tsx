
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Trash2, UserCircle } from 'lucide-react';
import { Permission, Project, ProjectShare } from '../../types/project';

interface ProjectSharingListProps {
  project: Project;
  onUpdatePermission: (projectId: string, shareId: string, permission: Permission) => void;
  onRemoveShare: (projectId: string, shareId: string) => void;
}

const ProjectSharingList: React.FC<ProjectSharingListProps> = ({ 
  project, 
  onUpdatePermission, 
  onRemoveShare 
}) => {
  const { t } = useLanguage();
  
  if (project.shares.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {t('noSharedUsers')}
      </div>
    );
  }
  
  const handlePermissionChange = (shareId: string, permission: string) => {
    onUpdatePermission(project.id, shareId, permission as Permission);
  };
  
  const handleRemoveShare = (shareId: string) => {
    onRemoveShare(project.id, shareId);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('user')}</TableHead>
          <TableHead>{t('permission')}</TableHead>
          <TableHead>{t('dateAdded')}</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {project.shares.map((share: ProjectShare) => (
          <TableRow key={share.id}>
            <TableCell className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <div>
                {share.userName && <div className="font-medium">{share.userName}</div>}
                <div className="text-sm text-muted-foreground">{share.userEmail}</div>
              </div>
            </TableCell>
            <TableCell>
              <Select 
                value={share.permission}
                onValueChange={(value) => handlePermissionChange(share.id, value)}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">{t('canView')}</SelectItem>
                  <SelectItem value="suggest">{t('canSuggest')}</SelectItem>
                  <SelectItem value="edit">{t('canEdit')}</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>{formatDate(share.dateAdded)}</TableCell>
            <TableCell>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleRemoveShare(share.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ProjectSharingList;
