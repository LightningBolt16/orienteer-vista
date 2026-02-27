import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Zap, RefreshCw, Loader2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { CountryFlagImage } from '@/components/CountrySelector';

interface LeaderboardEntry {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  totalAttempts: number;
  profileImage?: string;
  countryCode?: string;
}

interface MapOption {
  id: string;
  name: string;
}

interface RouteFinderLeaderboardInlineProps {
  countryFilter?: string;
  mapCategory?: string;
}

const RouteFinderLeaderboardInline: React.FC<RouteFinderLeaderboardInlineProps> = ({ countryFilter, mapCategory }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  const [maps, setMaps] = useState<MapOption[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available maps
  useEffect(() => {
    const loadMaps = async () => {
      try {
        let query = supabase
          .from('route_finder_maps')
          .select('id, name')
          .eq('is_public', true);
        
        if (mapCategory) {
          query = query.eq('map_category', mapCategory);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setMaps(data || []);
      } catch (err) {
        console.error('Error loading maps:', err);
      }
    };
    loadMaps();
  }, [mapCategory]);

  // Load leaderboard data
  const loadLeaderboard = async (mapFilter: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Query route_finder_attempts and aggregate stats
      let query = supabase
        .from('route_finder_attempts')
        .select('user_id, is_correct, response_time, map_name');
      
      if (mapFilter !== 'all') {
        query = query.eq('map_name', mapFilter);
      }
      
      const { data: attempts, error: attemptsError } = await query;
      
      if (attemptsError) throw attemptsError;
      
      if (!attempts || attempts.length === 0) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }
      
      // Aggregate by user
      const userStats = new Map<string, { correct: number; total: number; timeSum: number }>();
      
      for (const attempt of attempts) {
        const existing = userStats.get(attempt.user_id) || { correct: 0, total: 0, timeSum: 0 };
        userStats.set(attempt.user_id, {
          correct: existing.correct + (attempt.is_correct ? 1 : 0),
          total: existing.total + 1,
          timeSum: existing.timeSum + (attempt.response_time || 0),
        });
      }
      
      // Get user profiles for names and images
      const userIds = Array.from(userStats.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, name, profile_image, country_code')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Create profile lookup
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { 
          name: p.name, 
          profileImage: p.profile_image,
          countryCode: p.country_code
        }])
      );
      
      // Build leaderboard entries
      const entries: LeaderboardEntry[] = [];
      
      for (const [userId, stats] of userStats.entries()) {
        if (stats.total < 3) continue; // Minimum 3 attempts to appear
        
        const profile = profileMap.get(userId);
        entries.push({
          id: userId,
          name: profile?.name || 'Unknown',
          accuracy: Math.round((stats.correct / stats.total) * 100),
          speed: Math.round(stats.timeSum / stats.total),
          totalAttempts: stats.total,
          profileImage: profile?.profileImage,
          countryCode: profile?.countryCode,
        });
      }
      
      // Sort by accuracy (desc), then speed (asc)
      entries.sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return a.speed - b.speed;
      });
      
      // Apply country filter client-side
      const filtered = countryFilter 
        ? entries.filter(e => e.countryCode === countryFilter)
        : entries;
      
      setLeaderboard(filtered);
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(selectedMap);
  }, [selectedMap, countryFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaderboard(selectedMap);
    setIsRefreshing(false);
  };

  // Render mobile entry
  const renderMobileEntry = (entry: LeaderboardEntry, rank: number) => {
    const isCurrentUser = entry.id === user?.id;
    
    return (
      <div 
        key={entry.id} 
        className={`flex items-center p-2 rounded-lg transition-all cursor-pointer min-w-0 ${
          isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary'
        }`}
        onClick={() => navigate(isCurrentUser ? '/profile' : `/user/${entry.id}`)}
      >
        <div className="flex items-center mr-1.5 flex-shrink-0">
          <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium ${
            rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}>
            {rank}
          </div>
        </div>
        
        <Avatar className="h-5 w-5 mr-1.5 flex-shrink-0">
          {entry.profileImage ? (
            <AvatarImage src={entry.profileImage} alt={entry.name} />
          ) : (
            <AvatarFallback className="bg-secondary text-[8px]">
              {entry.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-1">
            {entry.countryCode && (
              <CountryFlagImage code={entry.countryCode} size={14} />
            )}
            <span className="font-medium text-xs truncate">{entry.name}</span>
            {isCurrentUser && (
              <span className="text-[8px] bg-primary/20 text-primary px-1 py-0.5 rounded-full">
                {t('you')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center" title={t('accuracy')}>
            <Target className="h-2.5 w-2.5 text-primary mr-0.5" />
            <span className="font-medium text-[10px]">{entry.accuracy}%</span>
          </div>
          
          <div className="flex items-center" title={t('speed')}>
            <Zap className="h-2.5 w-2.5 text-amber-500 mr-0.5" />
            <span className="font-medium text-[10px]">{(entry.speed / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    );
  };

  // Render desktop entry
  const renderDesktopEntry = (entry: LeaderboardEntry, rank: number) => {
    const isCurrentUser = entry.id === user?.id;
    
    return (
      <TableRow 
        key={entry.id} 
        className={`${isCurrentUser ? 'bg-primary/5' : ''} cursor-pointer hover:bg-secondary/50`}
        onClick={() => navigate(isCurrentUser ? '/profile' : `/user/${entry.id}`)}
      >
        <TableCell className="font-medium">
          <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
            rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}>
            {rank}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-3">
              {entry.profileImage ? (
                <AvatarImage src={entry.profileImage} alt={entry.name} />
              ) : (
                <AvatarFallback className="bg-secondary text-xs">
                  {entry.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex items-center gap-2">
              {entry.countryCode && (
                <CountryFlagImage code={entry.countryCode} size={20} />
              )}
              <span className="font-medium">{entry.name}</span>
              {isCurrentUser && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {t('you')}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center">
            <Target className="h-4 w-4 text-primary mr-2" />
            <span className="font-medium">{entry.accuracy}%</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-amber-500 mr-2" />
            <span className="font-medium">{(entry.speed / 1000).toFixed(1)}s</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {entry.totalAttempts} {t('attempts') || 'attempts'}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Tabs value={selectedMap} onValueChange={setSelectedMap} className="w-full">
      {/* Map Filter Tabs - centered, above leaderboard block (matching Route Choice layout) */}
      <TabsList className="w-full flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-6">
        <TabsTrigger 
          value="all" 
          className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
        >
          {t('allMaps') || 'All Maps'}
        </TabsTrigger>
        {maps.map(map => (
          <TabsTrigger 
            key={map.id} 
            value={map.name}
            className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
          >
            {map.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">{t('loading') || 'Loading leaderboard...'}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('errorLoadingLeaderboard') || 'Error loading leaderboard'}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={handleRefresh}>
            {t('tryAgain') || 'Try Again'}
          </Button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('noDataYet') || 'No data yet'}</h3>
          <p className="text-muted-foreground">
            {t('beFirstRouteFinder') || 'Be the first to complete Route Finder challenges!'}
          </p>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => renderMobileEntry(entry, index + 1))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('rank') || 'Rank'}</TableHead>
              <TableHead>{t('player') || 'Player'}</TableHead>
              <TableHead>{t('accuracy') || 'Accuracy'}</TableHead>
              <TableHead>{t('avgTime') || 'Avg Time'}</TableHead>
              <TableHead>{t('attempts') || 'Attempts'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => renderDesktopEntry(entry, index + 1))}
          </TableBody>
        </Table>
      )}
    </Tabs>
  );
};

export default RouteFinderLeaderboardInline;
