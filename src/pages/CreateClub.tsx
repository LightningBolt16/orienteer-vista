
import React, { useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const CreateClubPage: React.FC = () => {
  const { user, createClub } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [clubName, setClubName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size and type
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: t('fileTooLarge'),
        description: t('logoSizeLimit'),
        variant: 'destructive'
      });
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('invalidFileType'),
        description: t('logoTypeLimit'),
        variant: 'destructive'
      });
      return;
    }
    
    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (clubName.trim() === '') {
      toast({
        title: t('error'),
        description: t('clubNameRequired'),
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const clubId = await createClub(clubName, logoFile || undefined);
      
      if (clubId) {
        toast({
          title: t('success'),
          description: t('clubCreated')
        });
        navigate(`/club/${clubId}`);
      }
    } catch (error) {
      console.error('Error creating club:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto py-12 animate-fade-in">
      <div className="glass-card p-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2" 
            onClick={() => navigate('/clubs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('createNewClub')}</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div 
              className="w-32 h-32 rounded-lg border-2 border-dashed border-muted hover:border-muted-foreground transition-colors cursor-pointer flex items-center justify-center relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="Club logo preview" 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-2">{t('clickToUploadLogo')}</p>
                </div>
              )}
              
              <div className="absolute -bottom-2 -right-2 bg-orienteering text-white p-1 rounded-full shadow-md">
                <Upload className="h-4 w-4" />
              </div>
            </div>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleLogoChange}
              accept="image/png,image/jpeg,image/gif"
            />
            <p className="text-sm text-muted-foreground mt-2">{t('logoOptional')}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="club-name">{t('clubName')}</Label>
            <Input
              id="club-name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder={t('enterClubName')}
              required
              className="bg-background"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || clubName.trim() === ''}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                {t('creating')}
              </>
            ) : (
              t('createClub')
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateClubPage;
