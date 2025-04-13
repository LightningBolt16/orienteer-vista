
import React from 'react';
import { Trophy, Users, Zap, Target } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '../integrations/supabase/client';

const Leaderboard: React.FC = () => {
  const { leaderboard, user } = useUser();
  const { t } = useLanguage();

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Trophy className="h-5 w-5 text-orienteering mr-2" />
          <h2 className="text-xl font-medium">{t('leaderboard')}</h2>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="h-4 w-4 mr-1" />
          <span>{leaderboard.length} {t('orienteers')}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {leaderboard.slice(0, 10).map((entry, index) => (
          <div 
            key={entry.id} 
            className={`flex items-center p-3 rounded-lg transition-all ${
              entry.id === user?.id ? 'bg-orienteering/10 border border-orienteering/20' : 'hover:bg-secondary'
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 ${
              index < 3 ? 'bg-orienteering text-white' : 'bg-secondary'
            }`}>
              {index + 1}
            </div>
            
            <Avatar className="h-8 w-8 mr-3">
              {entry.profileImage ? (
                <AvatarImage 
                  src={entry.profileImage} 
                  alt={entry.name || 'User avatar'} 
                />
              ) : (
                <AvatarFallback className="bg-secondary text-xs">
                  {entry.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-grow">
              <div className="flex items-center">
                <span className="font-medium">{entry.name}</span>
                {entry.id === user?.id && (
                  <span className="ml-2 text-xs bg-orienteering/20 text-orienteering px-2 py-0.5 rounded-full">
                    {t('you')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-orienteering mr-1" />
                <span className="font-semibold">{entry.accuracy}%</span>
              </div>
              
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-amber-500 mr-1" />
                <span className="font-semibold">{entry.speed || 0}</span>
                <span className="text-muted-foreground text-sm ml-1">ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
