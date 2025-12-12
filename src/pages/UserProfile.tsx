import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, CheckCircle, XCircle, Map, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PublicUserProfile {
  user_id: string;
  name: string;
  profile_image: string | null;
  accuracy: number;
  speed: number;
  alltime_total: number;
  alltime_correct: number;
  alltime_time_sum: number;
}

interface MapStats {
  map_name: string;
  accuracy: number;
  speed: number;
  attempts: {
    total: number;
    correct: number;
    timeSum: number;
  };
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [mapStats, setMapStats] = useState<MapStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const { data, error } = await (supabase
          .from('user_profiles' as any)
          .select('user_id, name, profile_image, accuracy, speed, alltime_total, alltime_correct, alltime_time_sum')
          .eq('user_id', userId)
          .single() as any);

        if (error) {
          console.error('Error fetching profile:', error);
          navigate('/');
          return;
        }

        setProfile(data);

        // Fetch map stats
        const { data: mapStatsData } = await (supabase
          .from('user_map_stats' as any)
          .select('map_name, accuracy, speed, attempts')
          .eq('user_id', userId) as any);

        if (mapStatsData) {
          setMapStats(mapStatsData);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">{t('userNotFound') || 'User not found'}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('goBack') || 'Go Back'}
        </Button>
      </div>
    );
  }

  const allTimeTotal = profile.alltime_total || 0;
  const allTimeCorrect = profile.alltime_correct || 0;
  const allTimeIncorrect = allTimeTotal - allTimeCorrect;
  const allTimeAccuracy = allTimeTotal > 0 ? Math.round((allTimeCorrect / allTimeTotal) * 100) : 0;
  const allTimeAvgSpeed = allTimeCorrect > 0 ? Math.round(profile.alltime_time_sum / allTimeCorrect) : 0;

  return (
    <div className="max-w-4xl mx-auto py-12 animate-fade-in">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('goBack') || 'Go Back'}
      </Button>

      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image */}
          <div className="shrink-0">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {profile.profile_image ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.profile_image} alt={profile.name} className="object-cover" />
                  <AvatarFallback>
                    <User className="h-16 w-16 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="flex-grow space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <p className="text-muted-foreground mt-1">{t('orienteeringEnthusiast')}</p>
            </div>
          </div>
        </div>
        
        {/* Stats Tabs */}
        <div className="mt-10 border-t border-muted pt-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="overview">{t('overview') || 'Overview'}</TabsTrigger>
              <TabsTrigger value="maps">{t('perMap') || 'Per Map'}</TabsTrigger>
            </TabsList>

            {/* Overview Tab - All Time Stats */}
            <TabsContent value="overview">
              <h2 className="text-xl font-semibold mb-6">{t('allTimeStatistics') || 'All-Time Statistics'}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="text-3xl font-bold text-orienteering flex items-center">
                    {allTimeAvgSpeed}
                    <span className="text-sm ml-1">ms</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{t('avgResponseTime')}</div>
                </div>
                
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="text-3xl font-bold text-orienteering">{allTimeTotal}</div>
                  <div className="text-sm text-muted-foreground">{t('totalAttempts')}</div>
                </div>
                
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="text-3xl font-bold text-orienteering">
                    {allTimeAccuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">{t('accuracy')}</div>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border border-border flex items-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mr-4" />
                  <div>
                    <div className="text-lg font-medium">{allTimeCorrect}</div>
                    <div className="text-sm text-muted-foreground">{t('correctChoices')}</div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-border flex items-center">
                  <XCircle className="h-10 w-10 text-red-500 mr-4" />
                  <div>
                    <div className="text-lg font-medium">{allTimeIncorrect}</div>
                    <div className="text-sm text-muted-foreground">{t('incorrectChoices')}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Per Map Tab */}
            <TabsContent value="maps">
              <h2 className="text-xl font-semibold mb-6">{t('performanceByMap') || 'Performance by Map'}</h2>
              
              {mapStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noMapStats') || 'No map statistics available.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mapStats.map((stat) => (
                    <div key={stat.map_name} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center mb-3">
                        <Map className="h-5 w-5 text-orienteering mr-2" />
                        <h3 className="font-semibold">{stat.map_name}</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-lg font-bold text-orienteering">{stat.accuracy}%</div>
                          <div className="text-muted-foreground">{t('accuracy')}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orienteering">{stat.speed}ms</div>
                          <div className="text-muted-foreground">{t('speed') || 'Speed'}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orienteering">{stat.attempts?.total || 0}</div>
                          <div className="text-muted-foreground">{t('attempts') || 'Attempts'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
