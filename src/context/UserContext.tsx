import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from './LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { supabaseManager } from '../lib/supabaseUtils';
import { calculateWeightedStats, calculateCombinedScore as calcCombinedScore, AttemptData } from '../utils/scoringUtils';

type UserProfile = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  attempts?: {
    total: number;
    correct: number;
    timeSum: number;
  };
  profileImage?: string;
  alltimeTotal?: number;
  alltimeCorrect?: number;
  alltimeTimeSum?: number;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  rank?: number;
  previousRank?: number;
  profileImage?: string;
};

interface UserContextType {
  user: UserProfile | null;
  session: Session | null;
  leaderboard: LeaderboardEntry[];
  updatePerformance: (isCorrect: boolean, responseTime: number, mapName?: string) => void;
  setUser: (user: UserProfile) => void;
  getUserRank: () => number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isOfflineMode: boolean;
  fetchMapLeaderboard: (mapName: string) => Promise<LeaderboardEntry[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const { t } = useLanguage();

  // Set up authentication state listener and check for existing session
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        
        if (newSession?.user) {
          setTimeout(() => {
            fetchUserProfile(newSession.user.id);
          }, 0);
        } else {
          setUserState(null);
        }
      }
    );

    // THEN check for existing session
    supabaseManager.executeWithRetry(
      () => supabase.auth.getSession(),
      'Get current session'
    ).then(({ data: { session: currentSession }, error }) => {
      if (error) {
        console.error('Error fetching session:', error);
        setLoading(false);
        setIsOfflineMode(true);
        return;
      }
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to get session after retries:', error);
      setLoading(false);
      setIsOfflineMode(true);
    });

    // Also fetch the leaderboard on mount
    fetchLeaderboard();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from Supabase with retry
  const fetchUserProfile = async (userId: string) => {
    try {
      const data = await supabaseManager.executeWithRetry(
        async () => {
          const { data, error } = await (supabase
            .from('user_profiles' as any)
            .select('*')
            .eq('user_id', userId)
            .single() as any);

          if (error) {
            throw error;
          }
          
          return data;
        },
        'Fetch user profile'
      );
      
      if (data) {
        setUserState({
          id: userId,
          name: data.name || 'User',
          accuracy: data.accuracy || 0,
          speed: data.speed || 0,
          profileImage: data.profile_image || undefined,
          attempts: data.attempts as { total: number; correct: number; timeSum: number } || {
            total: 0,
            correct: 0,
            timeSum: 0
          },
          alltimeTotal: data.alltime_total || 0,
          alltimeCorrect: data.alltime_correct || 0,
          alltimeTimeSum: data.alltime_time_sum || 0
        });
        setIsOfflineMode(false);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchUserProfile after retries:', error);
      setLoading(false);
      setIsOfflineMode(true);
      
      // Provide fallback user data if we have a session but can't fetch profile
      if (session?.user) {
        setUserState({
          id: userId,
          name: session.user.email?.split('@')[0] || 'User',
          accuracy: 0,
          speed: 0,
          attempts: { total: 0, correct: 0, timeSum: 0 }
        });
      }
    }
  };

  // Fetch leaderboard data with retry - now uses weighted scoring with time decay
  const fetchLeaderboard = async () => {
    try {
      const data = await supabaseManager.executeWithRetry(
        async () => {
          const { data, error } = await (supabase
            .from('user_profiles' as any)
            .select('user_id, name, accuracy, speed, profile_image, previous_rank')
            .order('accuracy', { ascending: false })
            .order('speed', { ascending: true })
            .limit(50) as any);

          if (error) {
            throw error;
          }
          
          return data;
        },
        'Fetch leaderboard'
      );

      if (data && data.length > 0) {
        // Sort by combined score using new scoring formula with accuracy multiplier
        const sortedData = [...data].sort((a: any, b: any) => {
          const scoreA = calcCombinedScore(a.accuracy || 0, a.speed || 0);
          const scoreB = calcCombinedScore(b.accuracy || 0, b.speed || 0);
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
      
        setLeaderboard(rankedLeaderboard);

        // Update previous_rank in database for all users (async, don't wait)
        updatePreviousRanks(rankedLeaderboard);
      }
    } catch (error: any) {
      console.error('Error in fetchLeaderboard after retries:', error);
      // Keep previous leaderboard state in offline mode
    }
  };

  // Update previous ranks in database periodically
  const updatePreviousRanks = async (rankedLeaderboard: LeaderboardEntry[]) => {
    try {
      for (const entry of rankedLeaderboard.slice(0, 20)) {
        if (entry.rank !== entry.previousRank) {
          await (supabase
            .from('user_profiles' as any)
            .update({ previous_rank: entry.rank })
            .eq('user_id', entry.id) as any);
        }
      }
    } catch (error) {
      console.error('Error updating previous ranks:', error);
    }
  };

  // Calculate combined score (higher is better) - uses new scoring with accuracy multiplier
  const calculateCombinedScore = (accuracy: number, speed: number) => {
    return calcCombinedScore(accuracy, speed);
  };

  // Calculate user rank based on combined score (accuracy + speed)
  const getUserRank = (): number => {
    if (!user || !user.attempts || user.attempts.total === 0) return 0;
    
    const fullLeaderboard = [...leaderboard];
    
    if (!fullLeaderboard.some(entry => entry.id === user.id)) {
      fullLeaderboard.push({
        id: user.id,
        name: user.name,
        accuracy: user.accuracy,
        speed: user.speed,
        profileImage: user.profileImage
      });
    }
    
    // Sort by combined score (same as leaderboard default)
    fullLeaderboard.sort((a, b) => {
      const scoreA = calculateCombinedScore(a.accuracy, a.speed);
      const scoreB = calculateCombinedScore(b.accuracy, b.speed);
      return scoreB - scoreA;
    });
    
    fullLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    const userEntry = fullLeaderboard.find(entry => entry.id === user.id);
    return userEntry?.rank || 0;
  };

  // Update user performance with offline support and per-map stats
  const updatePerformance = async (isCorrect: boolean, responseTime: number, mapName?: string) => {
    if (!user || !session) {
      console.warn('Cannot update performance: No authenticated user');
      return;
    }
    
    const effectiveMapName = mapName || 'unknown';
    
    // Record individual route attempt for rolling 100 calculation
    try {
      await (supabase
        .from('route_attempts' as any)
        .insert({
          user_id: user.id,
          map_name: effectiveMapName,
          is_correct: isCorrect,
          response_time: responseTime
        }) as any);
    } catch (error) {
      console.error('Error recording route attempt:', error);
    }
    
    // Calculate stats from last 100 attempts with time decay (weighted scoring)
    try {
      const { data: recentAttempts, error: fetchError } = await (supabase
        .from('route_attempts' as any)
        .select('is_correct, response_time, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      
      if (fetchError) {
        console.error('Error fetching recent attempts:', fetchError);
      } else if (recentAttempts && recentAttempts.length > 0) {
        // Use weighted stats with time decay
        const weightedStats = calculateWeightedStats(recentAttempts as AttemptData[]);
        
        const total = recentAttempts.length;
        const correct = recentAttempts.filter((a: any) => a.is_correct).length;
        const correctAttempts = recentAttempts.filter((a: any) => a.is_correct);
        const timeSum = correctAttempts.reduce((sum: number, a: any) => sum + a.response_time, 0);
        
        // Use weighted accuracy and speed for display/leaderboard
        const newAccuracy = weightedStats.accuracy;
        const newSpeed = weightedStats.speed;
        
        // Update all-time stats
        const newAlltimeTotal = (user.alltimeTotal || 0) + 1;
        const newAlltimeCorrect = (user.alltimeCorrect || 0) + (isCorrect ? 1 : 0);
        const newAlltimeTimeSum = (user.alltimeTimeSum || 0) + (isCorrect ? responseTime : 0);

        const updatedUser = {
          ...user,
          accuracy: newAccuracy,
          speed: newSpeed,
          attempts: {
            total,
            correct,
            timeSum
          },
          alltimeTotal: newAlltimeTotal,
          alltimeCorrect: newAlltimeCorrect,
          alltimeTimeSum: newAlltimeTimeSum
        };
        
        // Update local state immediately
        setUserState(updatedUser);
        
        await supabaseManager.executeWithRetry(
          async () => {
            const { error } = await (supabase
              .from('user_profiles' as any)
              .update({
                accuracy: newAccuracy,
                speed: newSpeed,
                attempts: {
                  total,
                  correct,
                  timeSum
                },
                alltime_total: newAlltimeTotal,
                alltime_correct: newAlltimeCorrect,
                alltime_time_sum: newAlltimeTimeSum,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id) as any);
              
            if (error) {
              throw error;
            }
          },
          'Update user performance'
        );
      }
    } catch (error) {
      console.error('Error calculating rolling stats:', error);
    }
    
    // Update per-map stats from last 100 attempts for that map with time decay
    try {
      const { data: mapAttempts, error: mapFetchError } = await (supabase
        .from('route_attempts' as any)
        .select('is_correct, response_time, created_at')
        .eq('user_id', user.id)
        .eq('map_name', effectiveMapName)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      
      if (mapFetchError) {
        console.error('Error fetching map attempts:', mapFetchError);
        return;
      }
      
      if (mapAttempts && mapAttempts.length > 0) {
        // Use weighted stats with time decay for per-map stats
        const mapWeightedStats = calculateWeightedStats(mapAttempts as AttemptData[]);
        
        const mapTotal = mapAttempts.length;
        const mapCorrect = mapAttempts.filter((a: any) => a.is_correct).length;
        const mapCorrectAttempts = mapAttempts.filter((a: any) => a.is_correct);
        const mapTimeSum = mapCorrectAttempts.reduce((sum: number, a: any) => sum + a.response_time, 0);
        
        // Use weighted accuracy and speed
        const mapAccuracy = mapWeightedStats.accuracy;
        const mapSpeed = mapWeightedStats.speed;
        
        // Check if map stats exist
        const { data: existingStats } = await (supabase
          .from('user_map_stats' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('map_name', effectiveMapName)
          .maybeSingle() as any);
        
        if (existingStats) {
          await (supabase
            .from('user_map_stats' as any)
            .update({
              accuracy: mapAccuracy,
              speed: mapSpeed,
              attempts: {
                total: mapTotal,
                correct: mapCorrect,
                timeSum: mapTimeSum
              },
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('map_name', effectiveMapName) as any);
        } else {
          await (supabase
            .from('user_map_stats' as any)
            .insert({
              user_id: user.id,
              map_name: effectiveMapName,
              accuracy: mapAccuracy,
              speed: mapSpeed,
              attempts: {
                total: mapTotal,
                correct: mapCorrect,
                timeSum: mapTimeSum
              }
            }) as any);
        }
      }
    } catch (error) {
      console.error('Error updating map-specific stats:', error);
    }
  };

  // Fetch leaderboard for a specific map
  const fetchMapLeaderboard = async (mapName: string): Promise<LeaderboardEntry[]> => {
    try {
      if (mapName === 'all') {
        // Return overall leaderboard
        return leaderboard;
      }
      
      const { data, error } = await (supabase
        .from('user_map_stats' as any)
        .select(`
          user_id,
          accuracy,
          speed,
          user_profiles!inner(name, profile_image)
        `)
        .eq('map_name', mapName)
        .order('accuracy', { ascending: false })
        .order('speed', { ascending: true })
        .limit(10) as any);
      
      if (error) {
        console.error('Error fetching map leaderboard:', error);
        return [];
      }
      
      if (data && data.length > 0) {
        return data.map((entry: any, index: number) => ({
          id: entry.user_id,
          name: entry.user_profiles?.name || 'User',
          accuracy: entry.accuracy || 0,
          speed: entry.speed || 0,
          rank: index + 1,
          profileImage: entry.user_profiles?.profile_image
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error in fetchMapLeaderboard:', error);
      return [];
    }
  };

  // Update user profile with offline support
  const setUser = async (updatedUser: UserProfile) => {
    if (!session) {
      console.warn('Cannot update user: No authenticated session');
      return;
    }
    
    // Update local state immediately
    setUserState(updatedUser);
    
    // Try to update database
    try {
      const updateData: any = {
        name: updatedUser.name,
        updated_at: new Date().toISOString()
      };
      
      if (updatedUser.profileImage !== undefined) {
        updateData.profile_image = updatedUser.profileImage;
      }
      
      await supabaseManager.executeWithRetry(
        async () => {
          const { error } = await (supabase
            .from('user_profiles' as any)
            .update(updateData)
            .eq('user_id', updatedUser.id) as any);
            
          if (error) {
            throw error;
          }
        },
        'Update user profile'
      );
    } catch (error) {
      console.error('Error updating user profile (will retry later):', error);
    }
  };

  // Authentication methods with improved error handling
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      await supabaseManager.executeWithRetry(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) {
            throw error;
          }
          
          return data;
        },
        'Sign in'
      );
      
      setIsOfflineMode(false);
    } catch (error: any) {
      setLoading(false);
      
      if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
        setIsOfflineMode(true);
        toast({
          title: t('connectionError') || 'Connection error',
          description: t('checkConnection') || 'Please check your internet connection and try again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('signInError') || 'Sign in error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive'
        });
      }
      
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });
      
      if (error) {
        setLoading(false);
        toast({
          title: t('signUpError') || 'Sign up error',
          description: error.message,
          variant: 'destructive'
        });
        throw error;
      }
      
      setLoading(false);
      
      toast({
        title: t('verifyEmail') || 'Verify email',
        description: t('verifyEmailDescription') || 'Please check your email to verify your account.'
      });
    } catch (error: any) {
      setLoading(false);
      toast({
        title: t('signUpError') || 'Sign up error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: t('signOutError') || 'Sign out error',
          description: error.message,
          variant: 'destructive'
        });
      }
      
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.error('Error in signOut:', error);
      toast({
        title: t('signOutError') || 'Sign out error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        session,
        leaderboard, 
        updatePerformance, 
        setUser, 
        getUserRank,
        signIn,
        signUp,
        signOut,
        loading,
        isOfflineMode,
        fetchMapLeaderboard
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
