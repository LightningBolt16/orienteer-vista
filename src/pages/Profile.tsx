import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { User, Edit2, Save, CheckCircle, XCircle, Upload, Map, TrendingUp } from 'lucide-react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, subMonths, startOfDay, parseISO } from 'date-fns';

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

interface PerformanceDataPoint {
  date: string;
  accuracy: number;
  speed: number;
  attempts: number;
}

const Profile: React.FC = () => {
  const { user, setUser, getUserRank, loading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mapStats, setMapStats] = useState<MapStats[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');
  const [loadingStats, setLoadingStats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Update userName when user data loads
  useEffect(() => {
    if (user) {
      setUserName(user.name || '');
    }
  }, [user]);

  // Fetch per-map stats and performance history
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || user.id === '1') {
        setLoadingStats(false);
        return;
      }

      try {
        // Fetch per-map stats
        const { data: mapStatsData, error: mapError } = await (supabase
          .from('user_map_stats' as any)
          .select('map_name, accuracy, speed, attempts')
          .eq('user_id', user.id) as any);

        if (mapError) {
          console.error('Error fetching map stats:', mapError);
        } else {
          setMapStats(mapStatsData || []);
        }

        // Fetch route attempts for performance graph
        await fetchPerformanceData();
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  // Fetch performance data based on time filter
  useEffect(() => {
    if (user && user.id !== '1') {
      fetchPerformanceData();
    }
  }, [timeFilter, user]);

  const fetchPerformanceData = async () => {
    if (!user || user.id === '1') return;

    try {
      let startDate: Date | null = null;
      
      if (timeFilter === 'week') {
        startDate = subDays(new Date(), 7);
      } else if (timeFilter === 'month') {
        startDate = subMonths(new Date(), 1);
      }

      let query = supabase
        .from('route_attempts' as any)
        .select('created_at, is_correct, response_time')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: attempts, error } = await (query as any);

      if (error) {
        console.error('Error fetching performance data:', error);
        return;
      }

      if (attempts && attempts.length > 0) {
        // Group by date and calculate daily stats
        const dailyStats: Record<string, { correct: number; total: number; timeSum: number }> = {};

        attempts.forEach((attempt: any) => {
          const date = format(parseISO(attempt.created_at), 'yyyy-MM-dd');
          if (!dailyStats[date]) {
            dailyStats[date] = { correct: 0, total: 0, timeSum: 0 };
          }
          dailyStats[date].total++;
          if (attempt.is_correct) {
            dailyStats[date].correct++;
            dailyStats[date].timeSum += attempt.response_time;
          }
        });

        const chartData: PerformanceDataPoint[] = Object.entries(dailyStats).map(([date, stats]) => ({
          date: format(parseISO(date), 'MMM d'),
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          speed: stats.correct > 0 ? Math.round(stats.timeSum / stats.correct) : 0,
          attempts: stats.total,
        }));

        setPerformanceData(chartData);
      } else {
        setPerformanceData([]);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  // Create the avatar bucket if it doesn't exist yet
  useEffect(() => {
    const createBucketIfNotExists = async () => {
      try {
        const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
        
        if (getBucketsError) {
          console.error('Error checking buckets:', getBucketsError);
          return;
        }
        
        const avatarBucketExists = buckets.some(bucket => bucket.name === 'avatars');
        
        if (!avatarBucketExists) {
          const { error: createBucketError } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2
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
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await (supabase
        .from('user_profiles' as any)
        .update({ profile_image: publicUrl })
        .eq('user_id', user.id) as any);

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
        
        {/* Stats Tabs */}
        <div className="mt-10 border-t border-muted pt-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">{t('overview') || 'Overview'}</TabsTrigger>
              <TabsTrigger value="maps">{t('perMap') || 'Per Map'}</TabsTrigger>
              <TabsTrigger value="progress">{t('progress') || 'Progress'}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
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
                  <div className="text-sm text-muted-foreground">{t('totalAttempts')} ({t('last100') || 'last 100'})</div>
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
            </TabsContent>

            {/* Per Map Tab */}
            <TabsContent value="maps">
              <h2 className="text-xl font-semibold mb-6">{t('performanceByMap') || 'Performance by Map'}</h2>
              
              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orienteering"></div>
                </div>
              ) : mapStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noMapStats') || 'No map statistics yet. Play some routes to see your per-map performance!'}</p>
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

            {/* Progress Tab */}
            <TabsContent value="progress">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{t('performanceOverTime') || 'Performance Over Time'}</h2>
                <Select value={timeFilter} onValueChange={(value: 'week' | 'month' | 'all') => setTimeFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">{t('lastWeek') || 'Last Week'}</SelectItem>
                    <SelectItem value="month">{t('lastMonth') || 'Last Month'}</SelectItem>
                    <SelectItem value="all">{t('allTime') || 'All Time'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {performanceData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noPerformanceData') || 'No performance data yet. Play some routes to see your progress!'}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Accuracy Chart */}
                  <div className="p-4 rounded-lg border border-border">
                    <h3 className="font-semibold mb-4">{t('accuracyOverTime') || 'Accuracy Over Time'}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="accuracy" 
                          stroke="hsl(var(--orienteering))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--orienteering))' }}
                          name={t('accuracy') || 'Accuracy'}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Speed Chart */}
                  <div className="p-4 rounded-lg border border-border">
                    <h3 className="font-semibold mb-4">{t('speedOverTime') || 'Average Speed Over Time'}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="speed" 
                          stroke="hsl(142, 76%, 36%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(142, 76%, 36%)' }}
                          name={t('speed') || 'Speed (ms)'}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Attempts Chart */}
                  <div className="p-4 rounded-lg border border-border">
                    <h3 className="font-semibold mb-4">{t('dailyAttempts') || 'Daily Attempts'}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="attempts" 
                          stroke="hsl(217, 91%, 60%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(217, 91%, 60%)' }}
                          name={t('attempts') || 'Attempts'}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
