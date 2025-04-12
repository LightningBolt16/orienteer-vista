
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { User, Edit2, Save, CheckCircle, XCircle, Upload, Camera, Building2, Award, Zap, Trophy } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { supabase } from '../integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, setUser, getUserRank, loading, fetchUserProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Update userName when user data loads
  useEffect(() => {
    if (user) {
      setUserName(user.name || '');
    }
  }, [user]);

  // Redirect to auth page if not logged in and not a guest
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleSave = () => {
    if (!user) return;
    
    if (userName.trim() === '') {
      toast({
        title: t('invalidName'),
        description: t('nameEmpty'),
        variant: "destructive"
      });
      return;
    }
    
    setUser({
      ...user,
      name: userName
    });
    
    setIsEditing(false);
    
    toast({
      title: t('profileUpdated'),
      description: t('profileUpdateSuccess')
    });
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('invalidFileType'),
        description: t('pleaseSelectImage'),
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: t('fileTooLarge'),
        description: t('imageSizeLimit'),
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath);

      // Update user profile with new image URL
      await setUser({
        ...user,
        profileImage: publicUrl
      });

      toast({
        title: t('success'),
        description: t('profileImageUpdated')
      });
      
      // Refresh user profile to get the updated data
      await fetchUserProfile();
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      toast({
        title: t('error'),
        description: error.message || t('errorUploadingImage'),
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get user stats
  const totalAttempts = user.attempts?.total || 0;
  const correctAttempts = user.attempts?.correct || 0;
  const incorrectAttempts = totalAttempts - correctAttempts;
  const avgResponseTime = user.speed ? `${user.speed}` : '0';
  const accuracy = user.accuracy || 0;
  const rank = getUserRank();

  // Role display
  const getRoleIcon = () => {
    switch (user.role) {
      case 'elite':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'accurate':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'fast':
        return <Zap className="h-5 w-5 text-red-500" />;
      default:
        return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRoleText = () => {
    switch (user.role) {
      case 'elite':
        return t('roleElite');
      case 'accurate':
        return t('roleAccurate');
      case 'fast':
        return t('roleFast');
      default:
        return t('roleBeginner');
    }
  };

  const getRoleDescription = () => {
    switch (user.role) {
      case 'elite':
        return t('roleEliteDesc');
      case 'accurate':
        return t('roleAccurateDesc');
      case 'fast':
        return t('roleFastDesc');
      default:
        return t('roleBeginnerDesc');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 animate-fade-in">
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image */}
          <div className="shrink-0 relative">
            <div 
              className="w-32 h-32 relative rounded-full overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleProfileImageClick}
            >
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-white rounded-full"></div>
                </div>
              ) : (
                <>
                  <Avatar className="h-32 w-32">
                    {user.profileImage ? (
                      <AvatarImage src={user.profileImage} alt={user.name || 'User'} />
                    ) : (
                      <AvatarFallback className="bg-muted flex items-center justify-center">
                        <User className="h-16 w-16 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-orienteering rounded-full p-2 shadow-md">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
          
          {/* Profile Info */}
          <div className="flex-grow space-y-6 text-center md:text-left">
            <div>
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="text-2xl font-bold w-full bg-transparent border-b border-muted focus:border-orienteering focus:outline-none pb-1"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave}
                    className="p-2 text-orienteering hover:bg-orienteering/10 rounded-full transition-colors"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start">
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="ml-2 p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row items-center gap-2 mt-2">
                <div className="flex items-center px-3 py-1 rounded-full bg-secondary/50">
                  {getRoleIcon()}
                  <span className="ml-1 font-medium">{getRoleText()}</span>
                </div>
                
                {user.clubId && (
                  <Link 
                    to={`/club/${user.clubId}`} 
                    className="flex items-center px-3 py-1 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    <span>{user.clubName || t('yourClub')}</span>
                    {user.clubRole && user.clubRole !== 'member' && (
                      <span className="ml-1 text-xs bg-orienteering/20 text-orienteering px-2 py-0.5 rounded-full">
                        {user.clubRole}
                      </span>
                    )}
                  </Link>
                )}
              </div>
              
              <p className="text-muted-foreground mt-2">{getRoleDescription()}</p>
            </div>
            
            {totalAttempts > 0 && (
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-orienteering/10 text-orienteering">
                <span className="font-semibold">{t('rank')} {rank}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="mt-10 border-t border-muted pt-8">
          <h2 className="text-xl font-semibold mb-6">{t('yourStatistics')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering flex items-center">
                {avgResponseTime}
                <span className="text-sm ml-1">ms</span>
              </div>
              <div className="text-sm text-muted-foreground">{t('avgResponseTime')}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">{totalAttempts}</div>
              <div className="text-sm text-muted-foreground">{t('totalAttempts')}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">
                {accuracy}%
              </div>
              <div className="text-sm text-muted-foreground">{t('accuracy')}</div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border flex items-center">
              <CheckCircle className="h-10 w-10 text-green-500 mr-4" />
              <div>
                <div className="text-lg font-medium">{correctAttempts}</div>
                <div className="text-sm text-muted-foreground">{t('correctChoices')}</div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-border flex items-center">
              <XCircle className="h-10 w-10 text-red-500 mr-4" />
              <div>
                <div className="text-lg font-medium">{incorrectAttempts}</div>
                <div className="text-sm text-muted-foreground">{t('incorrectChoices')}</div>
              </div>
            </div>
          </div>
        </div>
        
        {!user.clubId && (
          <div className="mt-10 border-t border-muted pt-8">
            <h2 className="text-xl font-semibold mb-6">{t('clubMembership')}</h2>
            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center mb-4">{t('notInClub')}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link 
                  to="/clubs" 
                  className="px-4 py-2 bg-orienteering text-white rounded-md hover:bg-orienteering/90 transition-colors"
                >
                  {t('joinClub')}
                </Link>
                <Link 
                  to="/clubs/new" 
                  className="px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                >
                  {t('createClub')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
