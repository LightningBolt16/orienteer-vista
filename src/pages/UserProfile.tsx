import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, CheckCircle, XCircle, Map, ArrowLeft, TrendingUp, MapPin, Route } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, subMonths, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CountryFlagImage } from '@/components/CountrySelector';

interface PublicUserProfile {
  user_id: string;
  name: string;
  profile_image: string | null;
  accuracy: number;
  speed: number;
  alltime_total: number;
  alltime_correct: number;
  alltime_time_sum: number;
  country_code: string | null;
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

interface PerformanceDataPoint {
  date: string;
  accuracy: number;
  speed: number;
  attempts: number;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [mapStats, setMapStats] = useState<MapStats[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | '90days' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<'routeChoice' | 'routeFinder'>('routeChoice');
  const [rfStats, setRfStats] = useState<{ total: number; correct: number; timeSum: number }>({ total: 0, correct: 0, timeSum: 0 });
  const [rfMapStats, setRfMapStats] = useState<MapStats[]>([]);
  const [rfPerformanceData, setRfPerformanceData] = useState<PerformanceDataPoint[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const { data, error } = await (supabase
          .from('user_profiles' as any)
          .select('user_id, name, profile_image, accuracy, speed, alltime_total, alltime_correct, alltime_time_sum, country_code')
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

  // Fetch performance data based on time filter and game mode
  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!userId) return;
      const table = gameMode === 'routeChoice' ? 'route_attempts' : 'route_finder_attempts';

      try {
        let startDate: Date | null = null;
        if (timeFilter === 'week') startDate = subDays(new Date(), 7);
        else if (timeFilter === 'month') startDate = subMonths(new Date(), 1);
        else if (timeFilter === '90days') startDate = subDays(new Date(), 90);

        let query = supabase
          .from(table as any)
          .select('created_at, is_correct, response_time')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (startDate) query = query.gte('created_at', startDate.toISOString());
        const { data: attempts, error } = await (query as any);
        if (error) { console.error('Error fetching performance data:', error); return; }

        if (attempts && attempts.length > 0) {
          const dailyStats: Record<string, { correct: number; total: number; timeSum: number }> = {};
          attempts.forEach((attempt: any) => {
            const date = format(parseISO(attempt.created_at), 'yyyy-MM-dd');
            if (!dailyStats[date]) dailyStats[date] = { correct: 0, total: 0, timeSum: 0 };
            dailyStats[date].total++;
            if (attempt.is_correct) { dailyStats[date].correct++; dailyStats[date].timeSum += attempt.response_time; }
          });
          const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
            date: format(parseISO(date), 'MMM d'),
            accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            speed: stats.correct > 0 ? Math.round(stats.timeSum / stats.correct) : 0,
            attempts: stats.total,
          }));
          if (gameMode === 'routeChoice') setPerformanceData(chartData);
          else setRfPerformanceData(chartData);
        } else {
          if (gameMode === 'routeChoice') setPerformanceData([]);
          else setRfPerformanceData([]);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      }
    };
    fetchPerformanceData();
  }, [timeFilter, userId, gameMode]);

  // Fetch Route Finder aggregate stats
  useEffect(() => {
    const fetchRFStats = async () => {
      if (!userId) return;
      try {
        const { data: attempts } = await (supabase
          .from('route_finder_attempts')
          .select('user_id, is_correct, response_time, map_name')
          .eq('user_id', userId) as any);
        
        if (attempts && attempts.length > 0) {
          let total = 0, correct = 0, timeSum = 0;
          const mapAgg: Record<string, { total: number; correct: number; timeSum: number }> = {};
          for (const a of attempts) {
            total++;
            if (a.is_correct) { correct++; timeSum += a.response_time || 0; }
            if (!mapAgg[a.map_name]) mapAgg[a.map_name] = { total: 0, correct: 0, timeSum: 0 };
            mapAgg[a.map_name].total++;
            if (a.is_correct) { mapAgg[a.map_name].correct++; mapAgg[a.map_name].timeSum += a.response_time || 0; }
          }
          setRfStats({ total, correct, timeSum });
          setRfMapStats(Object.entries(mapAgg).map(([name, s]) => ({
            map_name: name,
            accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
            speed: s.correct > 0 ? Math.round(s.timeSum / s.correct) : 0,
            attempts: { total: s.total, correct: s.correct, timeSum: s.timeSum }
          })));
        }
      } catch (error) {
        console.error('Error fetching RF stats:', error);
      }
    };
    fetchRFStats();
  }, [userId]);

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
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.country_code && (
                  <CountryFlagImage code={profile.country_code} size={24} />
                )}
              </div>
              <p className="text-muted-foreground mt-1">{t('orienteeringEnthusiast')}</p>
            </div>
          </div>
        </div>
        
        {/* Game Mode Toggle */}
        <div className="mt-10 border-t border-muted pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MapPin className={`h-4 w-4 ${gameMode === 'routeChoice' ? 'text-orienteering' : 'text-muted-foreground'}`} />
              <Label htmlFor="up-game-mode-toggle" className="text-sm">{t('routeChoice') || 'Route Choice'}</Label>
              <Switch
                id="up-game-mode-toggle"
                checked={gameMode === 'routeFinder'}
                onCheckedChange={(checked) => setGameMode(checked ? 'routeFinder' : 'routeChoice')}
              />
              <Label htmlFor="up-game-mode-toggle" className="text-sm">{t('routeFinder') || 'Route Finder'}</Label>
              <Route className={`h-4 w-4 ${gameMode === 'routeFinder' ? 'text-orienteering' : 'text-muted-foreground'}`} />
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">{t('overview') || 'Overview'}</TabsTrigger>
              <TabsTrigger value="maps">{t('perMap') || 'Per Map'}</TabsTrigger>
              <TabsTrigger value="progress">{t('progress') || 'Progress'}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <h2 className="text-xl font-semibold mb-6">{t('allTimeStatistics') || 'All-Time Statistics'}</h2>
              {gameMode === 'routeChoice' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering flex items-center">{allTimeAvgSpeed}<span className="text-sm ml-1">ms</span></div>
                      <div className="text-sm text-muted-foreground">{t('avgResponseTime')}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering">{allTimeTotal}</div>
                      <div className="text-sm text-muted-foreground">{t('totalAttempts')}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering">{allTimeAccuracy}%</div>
                      <div className="text-sm text-muted-foreground">{t('accuracy')}</div>
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg border border-border flex items-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mr-4" />
                      <div><div className="text-lg font-medium">{allTimeCorrect}</div><div className="text-sm text-muted-foreground">{t('correctChoices')}</div></div>
                    </div>
                    <div className="p-4 rounded-lg border border-border flex items-center">
                      <XCircle className="h-10 w-10 text-red-500 mr-4" />
                      <div><div className="text-lg font-medium">{allTimeIncorrect}</div><div className="text-sm text-muted-foreground">{t('incorrectChoices')}</div></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering flex items-center">{rfStats.correct > 0 ? Math.round(rfStats.timeSum / rfStats.correct) : 0}<span className="text-sm ml-1">ms</span></div>
                      <div className="text-sm text-muted-foreground">{t('avgResponseTime')}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering">{rfStats.total}</div>
                      <div className="text-sm text-muted-foreground">{t('totalAttempts')}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="text-3xl font-bold text-orienteering">{rfStats.total > 0 ? Math.round((rfStats.correct / rfStats.total) * 100) : 0}%</div>
                      <div className="text-sm text-muted-foreground">{t('accuracy')}</div>
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg border border-border flex items-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mr-4" />
                      <div><div className="text-lg font-medium">{rfStats.correct}</div><div className="text-sm text-muted-foreground">{t('correctChoices')}</div></div>
                    </div>
                    <div className="p-4 rounded-lg border border-border flex items-center">
                      <XCircle className="h-10 w-10 text-red-500 mr-4" />
                      <div><div className="text-lg font-medium">{rfStats.total - rfStats.correct}</div><div className="text-sm text-muted-foreground">{t('incorrectChoices')}</div></div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Per Map Tab */}
            <TabsContent value="maps">
              <h2 className="text-xl font-semibold mb-6">{t('performanceByMap') || 'Performance by Map'}</h2>
              
              {(() => {
                const statsToShow = gameMode === 'routeChoice' ? mapStats : rfMapStats;
                return statsToShow.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noMapStats') || 'No map statistics available.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {statsToShow.map((stat) => (
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
              );
              })()}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{t('performanceOverTime') || 'Performance Over Time'}</h2>
                <Select value={timeFilter} onValueChange={(value: 'week' | 'month' | '90days' | 'all') => setTimeFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">{t('lastWeek') || '7 Days'}</SelectItem>
                    <SelectItem value="month">{t('lastMonth') || '30 Days'}</SelectItem>
                    <SelectItem value="90days">{t('last90Days') || '90 Days'}</SelectItem>
                    <SelectItem value="all">{t('allTime') || 'All Time'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(gameMode === 'routeChoice' ? performanceData : rfPerformanceData).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noPerformanceData') || 'No performance data available for this period.'}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Accuracy Chart */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('accuracyOverTime') || 'Accuracy Over Time'}</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gameMode === 'routeChoice' ? performanceData : rfPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis domain={[0, 100]} className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="accuracy" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                            name={t('accuracy') || 'Accuracy'}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Speed Chart */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('speedOverTime') || 'Average Speed Over Time'}</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gameMode === 'routeChoice' ? performanceData : rfPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="speed" 
                            stroke="hsl(var(--chart-2))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--chart-2))' }}
                            name={`${t('speed') || 'Speed'} (ms)`}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Daily Attempts Chart */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('dailyAttempts') || 'Daily Attempts'}</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gameMode === 'routeChoice' ? performanceData : rfPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="attempts" 
                            stroke="hsl(var(--chart-3))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--chart-3))' }}
                            name={t('attempts') || 'Attempts'}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
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

export default UserProfile;
