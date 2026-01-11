import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Users, Zap, Target, ArrowUp, ArrowDown, AlertCircle, Info, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateCombinedScore as calcCombinedScore, calculateAccuracyMultiplier } from '../utils/scoringUtils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '../hooks/use-mobile';

type SortField = 'accuracy' | 'speed' | 'combined';
type SortDirection = 'asc' | 'desc';

interface LeaderboardProps {
  mapFilter?: string;
  showAll?: boolean; // If true, show all users. If false, show top 10 + current user's position
}

type LeaderboardEntry = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  rank?: number;
  previousRank?: number;
  profileImage?: string;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ mapFilter = 'all', showAll = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leaderboard, user, fetchMapLeaderboard } = useUser();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField>('combined');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [displayLeaderboard, setDisplayLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const isOnLeaderboardPage = location.pathname === '/leaderboard';

  // Fetch leaderboard data based on mapFilter
  // Only show users with 100+ attempts
  const MIN_ATTEMPTS_FOR_LEADERBOARD = 100;

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        if (mapFilter === 'all') {
          // Always use the context leaderboard for "all" - if empty, wait for it
          if (leaderboard.length > 0) {
            setDisplayLeaderboard(leaderboard);
            setHasError(false);
          } else {
            // Leaderboard not loaded yet, fetch directly
            const { supabase } = await import('../integrations/supabase/client');
            const { data, error } = await (supabase
              .from('user_profiles' as any)
              .select('user_id, name, accuracy, speed, profile_image, previous_rank, alltime_total')
              .gte('alltime_total', MIN_ATTEMPTS_FOR_LEADERBOARD)
              .order('accuracy', { ascending: false })
              .order('speed', { ascending: true })
              .limit(50) as any);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
              const calculateScore = (accuracy: number, speed: number) => {
                return calcCombinedScore(accuracy, speed);
              };
              
              const sortedData = [...data].sort((a: any, b: any) => {
                const scoreA = calculateScore(a.accuracy || 0, a.speed || 0);
                const scoreB = calculateScore(b.accuracy || 0, b.speed || 0);
                return scoreB - scoreA;
              });
              
              const rankedLeaderboard = sortedData.map((entry: any, index: number) => ({
                id: entry.user_id,
                name: entry.name || 'User',
                accuracy: entry.accuracy || 0,
                speed: entry.speed || 0,
                rank: index + 1,
                previousRank: entry.previous_rank || null,
                profileImage: entry.profile_image
              }));
              
              setDisplayLeaderboard(rankedLeaderboard);
              setHasError(false);
            }
          }
        } else {
          const mapLeaderboard = await fetchMapLeaderboard(mapFilter);
          setDisplayLeaderboard(mapLeaderboard);
          setHasError(false);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setHasError(true);
      }
      setIsLoading(false);
    };
    
    loadLeaderboard();
  }, [mapFilter, leaderboard, fetchMapLeaderboard]);

  // Calculate combined score using new formula with accuracy multiplier
  const calculateCombinedScore = (accuracy: number, speed: number) => {
    return calcCombinedScore(accuracy, speed);
  };

  // Get the ranked leaderboard based on current sort field (always descending for ranking)
  const rankedLeaderboard = useMemo(() => {
    const sorted = [...displayLeaderboard].sort((a, b) => {
      if (sortField === 'accuracy') {
        return b.accuracy - a.accuracy;
      } else if (sortField === 'speed') {
        // For speed, lower is better, so ascending for "best"
        return (a.speed || Infinity) - (b.speed || Infinity);
      } else {
        const scoreA = calculateCombinedScore(a.accuracy, a.speed || 0);
        const scoreB = calculateCombinedScore(b.accuracy, b.speed || 0);
        return scoreB - scoreA;
      }
    });
    
    // Assign ranks based on the sorted order
    return sorted.map((entry, index) => ({
      ...entry,
      currentSortRank: index + 1
    }));
  }, [displayLeaderboard, sortField]);

  // Get rank change indicator - currently we only have previousRank for combined/overall score
  // For accuracy and speed, we don't have historical rank data, so we show neutral
  const getRankChange = (currentRank: number, previousRank?: number, forSortField?: SortField) => {
    // Only show rank change for combined/overall since that's what previousRank tracks
    // For accuracy and speed we don't have historical per-type rank data
    if (forSortField !== 'combined') {
      return { icon: Minus, color: 'text-muted-foreground', change: 0 };
    }
    
    if (!previousRank || previousRank === currentRank) {
      return { icon: Minus, color: 'text-muted-foreground', change: 0 };
    }
    if (previousRank > currentRank) {
      return { icon: TrendingUp, color: 'text-green-500', change: previousRank - currentRank };
    }
    return { icon: TrendingDown, color: 'text-red-500', change: currentRank - previousRank };
  };

  // Add refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setHasError(false);
    
    try {
      const { supabase } = await import('../integrations/supabase/client');
      
      if (mapFilter === 'all') {
        const { data, error } = await (supabase
          .from('user_profiles' as any)
          .select('user_id, name, accuracy, speed, profile_image, previous_rank, alltime_total')
          .gte('alltime_total', MIN_ATTEMPTS_FOR_LEADERBOARD)
          .order('accuracy', { ascending: false })
          .order('speed', { ascending: true })
          .limit(50) as any);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const calculateScore = (accuracy: number, speed: number) => {
            return calcCombinedScore(accuracy, speed);
          };
          
          const sortedData = [...data].sort((a: any, b: any) => {
            const scoreA = calculateScore(a.accuracy || 0, a.speed || 0);
            const scoreB = calculateScore(b.accuracy || 0, b.speed || 0);
            return scoreB - scoreA;
          });
          
          const rankedLeaderboard = sortedData.map((entry: any, index: number) => ({
            id: entry.user_id,
            name: entry.name || 'User',
            accuracy: entry.accuracy || 0,
            speed: entry.speed || 0,
            rank: index + 1,
            previousRank: entry.previous_rank || null,
            profileImage: entry.profile_image
          }));
          
          setDisplayLeaderboard(rankedLeaderboard);
        }
      } else {
        const mapLeaderboard = await fetchMapLeaderboard(mapFilter);
        setDisplayLeaderboard(mapLeaderboard);
      }
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
      setHasError(true);
    }
    setIsRefreshing(false);
  };
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // All fields default to 'desc' for display (best at top)
      setSortDirection('desc');
    }
  };
  
  // Get the display order based on sort direction
  // Ranking is always based on "best first" order, but display can be flipped
  const displayLeaderboardOrdered = useMemo(() => {
    if (sortDirection === 'desc') {
      return rankedLeaderboard;
    } else {
      // Reverse the display order but keep the original ranks
      return [...rankedLeaderboard].reverse();
    }
  }, [rankedLeaderboard, sortDirection]);

  // Get entries to display based on showAll prop
  const getEntriesToDisplay = useMemo(() => {
    if (showAll) {
      return displayLeaderboardOrdered;
    }
    
    // Show top 10
    const top10 = displayLeaderboardOrdered.slice(0, 10);
    
    // Check if current user is in top 10
    const currentUserInTop10 = top10.some(entry => entry.id === user?.id);
    
    if (currentUserInTop10 || !user?.id) {
      return top10;
    }
    
    // Find user's position in the full sorted list
    const userIndex = rankedLeaderboard.findIndex(entry => entry.id === user?.id);
    
    if (userIndex === -1) {
      return top10;
    }
    
    // Get user with one position above and below
    const userSection: typeof rankedLeaderboard = [];
    
    // One position above (if exists and not in top 10)
    if (userIndex > 0 && userIndex - 1 >= 10) {
      userSection.push(rankedLeaderboard[userIndex - 1]);
    }
    
    // User's position
    userSection.push(rankedLeaderboard[userIndex]);
    
    // One position below (if exists)
    if (userIndex < rankedLeaderboard.length - 1) {
      userSection.push(rankedLeaderboard[userIndex + 1]);
    }
    
    return { top10, userSection };
  }, [displayLeaderboardOrdered, rankedLeaderboard, showAll, user?.id]);

  // Loading and error states
  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-fade-in flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orienteering mb-4"></div>
        <p className="text-center text-muted-foreground">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-orienteering mr-2" />
            <h2 className="text-xl font-medium">{t('leaderboard')}</h2>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t('loginToViewLeaderboard') || 'Log in to view the leaderboard'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('loginToViewLeaderboardDesc') || 'Sign in to see how you rank against other players.'}
          </p>
          <Button 
            variant="default" 
            onClick={() => navigate('/auth')}
            className="flex items-center"
          >
            {t('login') || 'Log In'}
          </Button>
        </div>
      </div>
    );
  }

  // Error state or empty leaderboard
  if (hasError || displayLeaderboard.length === 0) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-orienteering mr-2" />
            <h2 className="text-xl font-medium">{t('leaderboard')}</h2>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {hasError ? 
              (t('connectionError') || 'Connection problem') : 
              (t('noLeaderboardData') || 'No leaderboard data available')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasError ? 
              (t('leaderboardFetchError') || 'We couldn\'t load the leaderboard data.') : 
              (t('emptyLeaderboard') || 'Be the first to complete a route!')}
          </p>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center"
          >
            <ArrowUp className="h-4 w-4 mr-2 rotate-45" />
            {t('refresh') || 'Refresh'}
          </Button>
        </div>
      </div>
    );
  }

  // Render a single entry row (mobile)
  const renderMobileEntry = (entry: typeof rankedLeaderboard[0]) => {
    const rankChange = getRankChange(entry.currentSortRank, entry.previousRank, sortField);
    const RankIcon = rankChange.icon;
    const isCurrentUser = entry.id === user?.id;
    
    return (
      <div 
        key={entry.id} 
        className={`flex items-center p-2 rounded-lg transition-all cursor-pointer min-w-0 ${
          isCurrentUser ? 'bg-orienteering/10 border border-orienteering/20' : 'hover:bg-secondary'
        }`}
        onClick={() => navigate(isCurrentUser ? '/profile' : `/user/${entry.id}`)}
      >
        <div className="flex items-center mr-1.5 flex-shrink-0">
          <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium ${
            entry.currentSortRank <= 3 ? 'bg-orienteering text-white' : 'bg-secondary'
          }`}>
            {entry.currentSortRank}
          </div>
          <RankIcon className={`h-2.5 w-2.5 ml-0.5 ${rankChange.color}`} />
        </div>
        
        <Avatar className="h-5 w-5 mr-1.5 flex-shrink-0">
          {entry.profileImage ? (
            <AvatarImage 
              src={entry.profileImage} 
              alt={entry.name || 'User avatar'} 
            />
          ) : (
            <AvatarFallback className="bg-secondary text-[8px]">
              {entry.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center min-w-0">
            <span className="font-medium text-xs truncate">{entry.name}</span>
            {entry.id === user?.id && (
              <span className="ml-1 text-[8px] bg-orienteering/20 text-orienteering px-1 py-0.5 rounded-full flex-shrink-0">
                {t('you')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center" title={t('accuracy')}>
            <Target className="h-2.5 w-2.5 text-orienteering mr-0.5" />
            <span className="font-medium text-[10px]">{entry.accuracy}%</span>
          </div>
          
          <div className="flex items-center" title={t('speed')}>
            <Zap className="h-2.5 w-2.5 text-amber-500 mr-0.5" />
            <span className="font-medium text-[10px]">{entry.speed || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render a single entry row (desktop)
  const renderDesktopEntry = (entry: typeof rankedLeaderboard[0]) => {
    const rankChange = getRankChange(entry.currentSortRank, entry.previousRank, sortField);
    const RankIcon = rankChange.icon;
    const isCurrentUser = entry.id === user?.id;
    
    return (
      <TableRow 
        key={entry.id} 
        className={`${isCurrentUser ? 'bg-orienteering/5' : ''} cursor-pointer hover:bg-secondary/50`}
        onClick={() => navigate(isCurrentUser ? '/profile' : `/user/${entry.id}`)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
              entry.currentSortRank <= 3 ? 'bg-orienteering text-white' : 'bg-secondary'
            }`}>
              {entry.currentSortRank}
            </div>
            <RankIcon className={`h-4 w-4 ${rankChange.color}`} />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center">
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
            <div>
              <span className="font-medium">{entry.name}</span>
              {entry.id === user?.id && (
                <span className="ml-2 text-xs bg-orienteering/20 text-orienteering px-2 py-0.5 rounded-full">
                  {t('you')}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end">
            <span className="font-semibold">{entry.accuracy}%</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end">
            <span className="font-semibold">{entry.speed || 0}</span>
            <span className="text-muted-foreground text-sm ml-1">ms</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end">
            <span className="font-semibold">
              {calculateCombinedScore(entry.accuracy, entry.speed || 0).toFixed(1)}
            </span>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Use compact layout for mobile
  if (isMobile) {
    const entries = getEntriesToDisplay;
    const hasUserSection = !showAll && !Array.isArray(entries) && 'userSection' in entries;
    
    return (
      <div className="glass-card p-3 animate-fade-in w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center min-w-0">
            <Trophy className="h-4 w-4 text-orienteering mr-1.5 flex-shrink-0" />
            <h2 className="text-base font-medium truncate">{t('leaderboard')}</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 cursor-pointer flex-shrink-0" />
              </PopoverTrigger>
              <PopoverContent className="max-w-xs">
                <p className="text-sm mb-2">{t('leaderboardTooltip') || 'Only your last 100 route attempts count. Attempts older than 30 days start losing value (fully gone after 120 days). Accuracy above 50% gives exponential boost, below 50% gives penalty. Overall score = (1000 ÷ Speed) × Accuracy Multiplier × 100.'}</p>
                <p className="text-sm font-medium text-primary">{t('leaderboardQualificationNotice') || 'Requires 100+ route attempts to qualify'}</p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {!isOnLeaderboardPage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => navigate('/leaderboard')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              <span>{displayLeaderboard.length}</span>
            </div>
          </div>
        </div>
        
        <div className="mb-2 flex justify-between text-xs gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-1.5 h-6 text-xs flex-1"
            onClick={() => handleSort('accuracy')}
          >
            <Target className="h-3 w-3 mr-0.5" />
            <span className="truncate">{t('accuracy')}</span>
            {sortField === 'accuracy' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-0.5 flex-shrink-0" /> : <ArrowUp className="h-3 w-3 ml-0.5 flex-shrink-0" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-1.5 h-6 text-xs flex-1"
            onClick={() => handleSort('speed')}
          >
            <Zap className="h-3 w-3 mr-0.5" />
            <span className="truncate">{t('speed')}</span>
            {sortField === 'speed' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-0.5 flex-shrink-0" /> : <ArrowUp className="h-3 w-3 ml-0.5 flex-shrink-0" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-1.5 h-6 text-xs flex-1"
            onClick={() => handleSort('combined')}
          >
            <Trophy className="h-3 w-3 mr-0.5" />
            <span className="truncate">{t('overall')}</span>
            {sortField === 'combined' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-0.5 flex-shrink-0" /> : <ArrowUp className="h-3 w-3 ml-0.5 flex-shrink-0" />
            )}
          </Button>
        </div>
        
        <div className="space-y-1.5">
          {hasUserSection ? (
            <>
              {(entries as { top10: typeof rankedLeaderboard; userSection: typeof rankedLeaderboard }).top10.map(renderMobileEntry)}
              
              {/* Separator */}
              <div className="flex items-center py-2">
                <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                <span className="px-2 text-xs text-muted-foreground">•••</span>
                <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
              </div>
              
              {(entries as { top10: typeof rankedLeaderboard; userSection: typeof rankedLeaderboard }).userSection.map(renderMobileEntry)}
            </>
          ) : (
            (Array.isArray(entries) ? entries : []).map(renderMobileEntry)
          )}
        </div>
      </div>
    );
  }

  // Desktop layout with table
  const entries = getEntriesToDisplay;
  const hasUserSection = !showAll && !Array.isArray(entries) && 'userSection' in entries;

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Trophy className="h-5 w-5 text-orienteering mr-2" />
          <h2 className="text-xl font-medium">{t('leaderboard')}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground ml-2 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm mb-2">{t('leaderboardTooltip') || 'Only your last 100 route attempts count. Attempts older than 30 days start losing value (fully gone after 120 days). Accuracy above 50% gives exponential boost, below 50% gives penalty. Overall score = (1000 ÷ Speed) × Accuracy Multiplier × 100.'}</p>
                <p className="text-sm font-medium text-primary">{t('leaderboardQualificationNotice') || 'Requires 100+ route attempts to qualify'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span>{displayLeaderboard.length} {t('orienteers')}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {!isOnLeaderboardPage && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/leaderboard')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('viewFullLeaderboard') || 'View full leaderboard'}
            </Button>
          )}
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-32 cursor-pointer" onClick={() => handleSort('accuracy')}>
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                {t('accuracy')}
                {sortField === 'accuracy' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />
                )}
              </div>
            </TableHead>
            <TableHead className="w-32 cursor-pointer" onClick={() => handleSort('speed')}>
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                {t('speed')}
                {sortField === 'speed' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />
                )}
              </div>
            </TableHead>
            <TableHead className="w-32 cursor-pointer" onClick={() => handleSort('combined')}>
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-1" />
                {t('overall')}
                {sortField === 'combined' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasUserSection ? (
            <>
              {(entries as { top10: typeof rankedLeaderboard; userSection: typeof rankedLeaderboard }).top10.map(renderDesktopEntry)}
              
              {/* Separator row */}
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-2">
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                    <span className="px-4 text-sm text-muted-foreground">•••</span>
                    <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  </div>
                </TableCell>
              </TableRow>
              
              {(entries as { top10: typeof rankedLeaderboard; userSection: typeof rankedLeaderboard }).userSection.map(renderDesktopEntry)}
            </>
          ) : (
            (Array.isArray(entries) ? entries : []).map(renderDesktopEntry)
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;
