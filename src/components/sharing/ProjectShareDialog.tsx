
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from '../../components/ui/use-toast';
import { Permission, Project } from '../../types/project';

interface ProjectShareDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (projectId: string, userEmail: string, userName: string | undefined, permission: Permission) => void;
}

const ProjectShareDialog: React.FC<ProjectShareDialogProps> = ({ 
  project, 
  open, 
  onOpenChange,
  onShare
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [permission, setPermission] = useState<Permission>('view');
  
  const handleShare = () => {
    if (!email.trim()) {
      toast({
        title: t('error'),
        description: t('emailRequired'),
        variant: 'destructive'
      });
      return;
    }
    
    // Basic email validation
    if (!email.includes('@')) {
      toast({
        title: t('error'),
        description: t('invalidEmail'),
        variant: 'destructive'
      });
      return;
    }
    
    onShare(project.id, email, name.trim() || undefined, permission);
    
    // Reset form
    setEmail('');
    setName('');
    setPermission('view');
    
    // Close dialog
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shareProject')}</DialogTitle>
          <DialogDescription>
            {t('shareProjectDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              placeholder={t('enterName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="permission">{t('permission')} *</Label>
            <Select value={permission} onValueChange={(value) => setPermission(value as Permission)}>
              <SelectTrigger id="permission">
                <SelectValue placeholder={t('selectPermission')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">{t('canView')}</SelectItem>
                <SelectItem value="suggest">{t('canSuggest')}</SelectItem>
                <SelectItem value="edit">{t('canEdit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button type="button" onClick={handleShare}>{t('share')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectShareDialog;
