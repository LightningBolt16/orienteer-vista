import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { User, Edit2, Save, CheckCircle, XCircle, Upload } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const Profile: React.FC = () => {
  const { user, setUser, getUserRank, loading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Update userName when user data loads
  useEffect(() => {
    if (user) {
      setUserName(user.name || '');
    }
  }, [user]);

  // Create the avatar bucket if it doesn't exist yet
  useEffect(() => {
    const createBucketIfNotExists = async () => {
      try {
        // Check if the bucket exists
        const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
        
        if (getBucketsError) {
          console.error('Error checking buckets:', getBucketsError);
          return;
        }
        
        const avatarBucketExists = buckets.some(bucket => bucket.name === 'avatars');
        
        if (!avatarBucketExists) {
          // Create the avatar bucket
          const { error: createBucketError } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2 // 2MB limit
          });
          
          if (createBucketError) {
            console.error('Error creating avatar bucket:', createBucketError);
          }
        }
      } catch (error) {
        console.error('Error in createBucketIfNotExists:', error);
      }
    };
    
    createBucketIfNotExists();
  }, []);

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

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const fileExt = file.name.split('.').pop();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
    if (!allowedTypes.includes(fileExt?.toLowerCase() || '')) {
      toast({
        title: t('invalidFileType'),
        description: t('allowedFileTypes') + allowedTypes.join(', '),
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('fileTooLarge'),
        description: t('maxFileSize'),
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create unique file name
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile with avatar URL
      await supabase
        .from('user_profiles')
        .update({ profile_image: publicUrl })
        .eq('id', user.id);

      // Update local user state
      setUser({
        ...user,
        profileImage: publicUrl
      });

      toast({
        title: t('success'),
        description: t('profileImageUpdated'),
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: t('error'),
        description: error.message || t('uploadFailed'),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Get user stats
  const totalAttempts = user.attempts?.total || 0;
  const correctAttempts = user.attempts?.correct || 0;
  const incorrectAttempts = totalAttempts - correctAttempts;
  const avgResponseTime = user.speed ? `${user.speed}` : '0';
  const accuracy = user.accuracy || 0;
  const rank = getUserRank();

  return (
    <div className="max-w-4xl mx-auto py-12 animate-fade-in">
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image with Upload */}
          <div className="shrink-0 relative">
            <div 
              className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={handleImageClick}
            >
              {user.profileImage ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={user.profileImage} alt={user.name} className="object-cover" />
                  <AvatarFallback>
                    <User className="h-16 w-16 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-16 w-16 text-muted-foreground" />
              )}
              
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-8 w-8 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/gif" 
              onChange={handleImageUpload} 
              disabled={uploading}
            />
            {uploading && (
              <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full bg-black/30 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
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
              <p className="text-muted-foreground mt-1">{t('orienteeringEnthusiast')}</p>
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
      </div>
    </div>
  );
};

export default Profile;
