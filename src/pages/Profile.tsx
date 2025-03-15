
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { User, Award, Edit2, Save, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';

const Profile: React.FC = () => {
  const { user, setUser } = useUser();
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

  // Calculate average response time in seconds (if attempts exist)
  const avgResponseTime = user.attempts && user.attempts.total > 0 
    ? (user.attempts.timeSum / user.attempts.total / 1000).toFixed(2)
    : '0.00';

  // Calculate correct rate based on points and attempts
  const totalAttempts = user.attempts?.total || 0;
  const correctAttempts = totalAttempts > 0 ? Math.ceil(user.points / 10) : 0;
  const correctRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

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
            
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-orienteering/10 text-orienteering">
              <Award className="h-5 w-5 mr-2" />
              <span className="font-semibold">{user.points}</span>
              <span className="ml-1">{t('total.points')}</span>
            </div>
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="mt-10 border-t border-muted pt-8">
          <h2 className="text-xl font-semibold mb-6">{t('your.statistics')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">
                {avgResponseTime}s
              </div>
              <div className="text-sm text-muted-foreground">{t('avg.response.time')}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">{totalAttempts}</div>
              <div className="text-sm text-muted-foreground">{t('total.attempts')}</div>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-3xl font-bold text-orienteering">
                {correctRate}%
              </div>
              <div className="text-sm text-muted-foreground">{t('correct.rate')}</div>
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
                <div className="text-lg font-medium">{totalAttempts - correctAttempts}</div>
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
