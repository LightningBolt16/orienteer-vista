
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { User, Edit2, Save, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';

const Profile: React.FC = () => {
  const { user, setUser, getUserRank } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(user?.name || '');
  const { t } = useLanguage();

  const handleSave = () => {
    if (!user) return;
    
    if (userName.trim() === '') {
      toast({
        title: t('invalid.name'),
        description: t('name.empty'),
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
      title: t('profile.updated'),
      description: t('profile.update.success')
    });
  };

  if (!user) return <div>Loading...</div>;

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
          {/* Profile Image */}
          <div className="shrink-0">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
              <User className="h-16 w-16 text-muted-foreground" />
            </div>
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
              <p className="text-muted-foreground mt-1">{t('orienteering.enthusiast')}</p>
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
          <h2 className="text-xl font-semibold mb-6">{t('your.statistics')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering flex items-center">
                {avgResponseTime}
                <span className="text-sm ml-1">ms</span>
              </div>
              <div className="text-sm text-muted-foreground">{t('avg.response.time')}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">{totalAttempts}</div>
              <div className="text-sm text-muted-foreground">{t('total.attempts')}</div>
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
                <div className="text-sm text-muted-foreground">{t('correct.choices')}</div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border border-border flex items-center">
              <XCircle className="h-10 w-10 text-red-500 mr-4" />
              <div>
                <div className="text-lg font-medium">{incorrectAttempts}</div>
                <div className="text-sm text-muted-foreground">{t('incorrect.choices')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
