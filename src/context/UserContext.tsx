import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from './LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { supabaseManager } from '../lib/supabaseUtils';

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
};

type LeaderboardEntry = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  rank?: number;
  profileImage?: string;
};

interface UserContextType {
  user: UserProfile | null;
  session: Session | null;
  leaderboard: LeaderboardEntry[];
  updatePerformance: (isCorrect: boolean, responseTime: number) => void;
  setUser: (user: UserProfile) => void;
  getUserRank: () => number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isOfflineMode: boolean;
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
          }
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

  // Fetch leaderboard data with retry
  const fetchLeaderboard = async () => {
    try {
      const data = await supabaseManager.executeWithRetry(
        async () => {
          const { data, error } = await (supabase
            .from('user_profiles' as any)
            .select('user_id, name, accuracy, speed, profile_image')
            .order('accuracy', { ascending: false })
            .order('speed', { ascending: true })
            .limit(10) as any);

          if (error) {
            throw error;
          }
          
          return data;
        },
        'Fetch leaderboard'
      );

      if (data && data.length > 0) {
        const rankedLeaderboard = data.map((entry: any, index: number) => ({
          id: entry.user_id,
          name: entry.name || 'User',
          accuracy: entry.accuracy || 0,
          speed: entry.speed || 0,
          rank: index + 1,
          profileImage: entry.profile_image
        }));
      
        setLeaderboard(rankedLeaderboard);
      }
    } catch (error: any) {
      console.error('Error in fetchLeaderboard after retries:', error);
      // Keep previous leaderboard state in offline mode
    }
  };

  // Calculate user rank based on accuracy and speed
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
    
    fullLeaderboard.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return a.speed - b.speed;
    });
    
    fullLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    const userEntry = fullLeaderboard.find(entry => entry.id === user.id);
    return userEntry?.rank || 0;
  };

  // Update user performance with offline support
  const updatePerformance = async (isCorrect: boolean, responseTime: number) => {
    if (!user || !session) {
      console.warn('Cannot update performance: No authenticated user');
      return;
    }
    
    const attempts = user.attempts || { total: 0, correct: 0, timeSum: 0 };
    const newTotal = attempts.total + 1;
    const newCorrect = attempts.correct + (isCorrect ? 1 : 0);
    const newTimeSum = attempts.timeSum + (isCorrect ? responseTime : 0);
    
    const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
    const newSpeed = newCorrect > 0 ? Math.round(newTimeSum / newCorrect) : 0;
    
    const updatedUser = {
      ...user,
      accuracy: newAccuracy,
      speed: newSpeed,
      attempts: {
        total: newTotal,
        correct: newCorrect,
        timeSum: newTimeSum
      }
    };
    
    // Update local state immediately
    setUserState(updatedUser);
    
    // Try to update database, but don't fail if offline
    try {
      await supabaseManager.executeWithRetry(
        async () => {
          const { error } = await (supabase
            .from('user_profiles' as any)
            .update({
              accuracy: newAccuracy,
              speed: newSpeed,
              attempts: {
                total: newTotal,
                correct: newCorrect,
                timeSum: newTimeSum
              },
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id) as any);
            
          if (error) {
            throw error;
          }
        },
        'Update user performance'
      );
    } catch (error) {
      console.error('Error updating performance (will retry later):', error);
      // In a real app, you might queue this update for later
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
        isOfflineMode
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
