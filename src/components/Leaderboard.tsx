import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Zap, Target, ArrowUp, ArrowDown, AlertCircle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
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
import { useIsMobile } from '../hooks/use-mobile';

type SortField = 'accuracy' | 'speed' | 'combined';
type SortDirection = 'asc' | 'desc';

interface LeaderboardProps {
  mapFilter?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ mapFilter = 'all' }) => {
  const navigate = useNavigate();
  const { leaderboard, user, fetchMapLeaderboard } = useUser();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField>('combined');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [displayLeaderboard, setDisplayLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Fetch leaderboard data based on mapFilter
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        if (mapFilter === 'all') {
          setDisplayLeaderboard(leaderboard);
        } else {
          const mapLeaderboard = await fetchMapLeaderboard(mapFilter);
          setDisplayLeaderboard(mapLeaderboard);
        }
        setHasError(false);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setHasError(true);
      }
      setIsLoading(false);
    };
    
    loadLeaderboard();
  }, [mapFilter, leaderboard, fetchMapLeaderboard]);

  type LeaderboardEntry = {
    id: string;
    name: string;
    accuracy: number;
    speed: number;
    rank?: number;
    previousRank?: number;
    profileImage?: string;
  };

  // Get rank change indicator
  const getRankChange = (currentRank: number, previousRank?: number) => {
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
    setIsLoading(true);
    setHasError(false);
    
    try {
      // Try to fetch leaderboard data again
      // This is handled inside UserContext, but we need to trigger it
      const { supabase } = await import('../integrations/supabase/client');
      
      const { error } = await (supabase.from('user_profiles' as any)
        .select('id')
        .limit(1) as any);
        
      if (error) {
        throw error;
      }
      
      // Wait a moment to allow the fetch to complete
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  // Calculate combined score (higher is better)
  const calculateCombinedScore = (accuracy: number, speed: number) => {
    if (speed === 0) return accuracy; // If no speed, just use accuracy
    return accuracy * (1000 / Math.max(speed, 1)); // Higher accuracy and lower speed (faster time) is better
  };
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default direction
      setSortField(field);
      setSortDirection(field === 'speed' ? 'asc' : 'desc'); // For speed, lower is better
    }
  };
  
  // Sort the leaderboard
  const sortedLeaderboard = [...displayLeaderboard].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'accuracy') {
      comparison = a.accuracy - b.accuracy;
    } else if (sortField === 'speed') {
      // For speed, lower is better
      comparison = (a.speed || 0) - (b.speed || 0);
    } else {
      const scoreA = calculateCombinedScore(a.accuracy, a.speed || 0);
      const scoreB = calculateCombinedScore(b.accuracy, b.speed || 0);
      comparison = scoreA - scoreB;
    }
    
    // Apply direction
    return sortDirection === 'desc' ? -comparison : comparison;
  });

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

  // Use compact layout for mobile
  if (isMobile) {
    return (
      <div className="glass-card p-3 animate-fade-in w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center min-w-0">
            <Trophy className="h-4 w-4 text-orienteering mr-1.5 flex-shrink-0" />
            <h2 className="text-base font-medium truncate">{t('leaderboard')}</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{t('leaderboardTooltip') || 'Only your last 100 route attempts count. Overall score = Accuracy × (1000 ÷ Speed). Higher accuracy and faster times give better scores.'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
            <Users className="h-3 w-3 mr-1" />
            <span>{displayLeaderboard.length}</span>
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
          {sortedLeaderboard.slice(0, 10).map((entry, index) => {
            const rankChange = getRankChange(index + 1, entry.previousRank);
            const RankIcon = rankChange.icon;
            const isCurrentUser = entry.id === user?.id;
            
            return (
              <div 
                key={entry.id} 
                className={`flex items-center p-2 rounded-lg transition-all cursor-pointer min-w-0 ${
                  isCurrentUser ? 'bg-orienteering/10 border border-orienteering/20' : 'hover:bg-secondary'
                }`}
                onClick={() => !isCurrentUser && navigate(`/user/${entry.id}`)}
              >
                <div className="flex items-center mr-1.5 flex-shrink-0">
                  <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium ${
                    index < 3 ? 'bg-orienteering text-white' : 'bg-secondary'
                  }`}>
                    {index + 1}
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
          })}
        </div>
      </div>
    );
  }

  // Desktop layout with table
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
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{t('leaderboardTooltip') || 'Only your last 100 route attempts count. Overall score = Accuracy × (1000 ÷ Speed). Higher accuracy and faster times give better scores.'}</p>
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
            className="ml-2"
          >
            <ArrowUp className="h-4 w-4 rotate-45" />
          </Button>
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
          {sortedLeaderboard.slice(0, 10).map((entry, index) => {
            const rankChange = getRankChange(index + 1, entry.previousRank);
            const RankIcon = rankChange.icon;
            const isCurrentUser = entry.id === user?.id;
            
            return (
              <TableRow 
                key={entry.id} 
                className={`${isCurrentUser ? 'bg-orienteering/5' : ''} ${!isCurrentUser ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
                onClick={() => !isCurrentUser && navigate(`/user/${entry.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      index < 3 ? 'bg-orienteering text-white' : 'bg-secondary'
                    }`}>
                      {index + 1}
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
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;
