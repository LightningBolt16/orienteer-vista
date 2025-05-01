
import React, { useState } from 'react';
import { Trophy, Users, Zap, Target, ArrowUp, ArrowDown } from 'lucide-react';
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
import { useIsMobile } from '../hooks/use-mobile';

type SortField = 'accuracy' | 'speed' | 'combined';
type SortDirection = 'asc' | 'desc';

const Leaderboard: React.FC = () => {
  const { leaderboard, user } = useUser();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField>('accuracy');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
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

  // Use compact layout for mobile
  if (isMobile) {
    return (
      <div className="glass-card p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-orienteering mr-2" />
            <h2 className="text-lg font-medium">{t('leaderboard')}</h2>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="h-3 w-3 mr-1" />
            <span>{leaderboard.length}</span>
          </div>
        </div>
        
        <div className="mb-2 flex justify-between text-xs">
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-2 h-7"
            onClick={() => handleSort('accuracy')}
          >
            <Target className="h-3 w-3 mr-1" />
            {t('accuracy')}
            {sortField === 'accuracy' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-2 h-7"
            onClick={() => handleSort('speed')}
          >
            <Zap className="h-3 w-3 mr-1" />
            {t('speed')}
            {sortField === 'speed' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-2 h-7"
            onClick={() => handleSort('combined')}
          >
            <Trophy className="h-3 w-3 mr-1" />
            {t('overall')}
            {sortField === 'combined' && (
              sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
            )}
          </Button>
        </div>
        
        <div className="space-y-2">
          {sortedLeaderboard.slice(0, 10).map((entry, index) => (
            <div 
              key={entry.id} 
              className={`flex items-center p-2 rounded-lg transition-all ${
                entry.id === user?.id ? 'bg-orienteering/10 border border-orienteering/20' : 'hover:bg-secondary'
              }`}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 text-xs ${
                index < 3 ? 'bg-orienteering text-white' : 'bg-secondary'
              }`}>
                {index + 1}
              </div>
              
              <Avatar className="h-6 w-6 mr-2">
                {entry.profileImage ? (
                  <AvatarImage 
                    src={entry.profileImage} 
                    alt={entry.name || 'User avatar'} 
                  />
                ) : (
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {entry.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-grow truncate text-sm">
                <span className="font-medium truncate">{entry.name}</span>
                {entry.id === user?.id && (
                  <span className="ml-1 text-[10px] bg-orienteering/20 text-orienteering px-1 py-0.5 rounded-full">
                    {t('you')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center" title={t('accuracy')}>
                  <Target className="h-3 w-3 text-orienteering mr-1" />
                  <span className="font-medium text-xs">{entry.accuracy}%</span>
                </div>
                
                <div className="flex items-center" title={t('speed')}>
                  <Zap className="h-3 w-3 text-amber-500 mr-1" />
                  <span className="font-medium text-xs">{entry.speed || 0}</span>
                </div>
              </div>
            </div>
          ))}
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
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="h-4 w-4 mr-1" />
          <span>{leaderboard.length} {t('orienteers')}</span>
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
          {sortedLeaderboard.slice(0, 10).map((entry, index) => (
            <TableRow key={entry.id} className={entry.id === user?.id ? 'bg-orienteering/5' : ''}>
              <TableCell className="font-medium">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  index < 3 ? 'bg-orienteering text-white' : 'bg-secondary'
                }`}>
                  {index + 1}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Leaderboard;
