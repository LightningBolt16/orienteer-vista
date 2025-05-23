import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from './LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/types';
import { fetchWithRetry } from '../lib/utils';

type Tables = Database['public']['Tables'];
type UserProfileRow = Tables['user_profiles']['Row'];

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Attempt to refresh connection to Supabase
  const refreshSupabaseConnection = async () => {
    try {
      // Try to get the current session to test connection
      const { error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      
      // Connection restored, fetch data
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      fetchLeaderboard();
      
      // Notify user that connection is restored
      toast({
        title: t('connectionRestored') || 'Connection restored',
        description: t('dataRefreshed') || 'Your data has been refreshed',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to refresh connection:', error);
      return false;
    }
  };

  // Set up authentication state listener and check for existing session
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only synchronous state updates here
        setSession(newSession);
        
        // Defer fetching user profile with setTimeout to prevent recursion
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
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (error) {
        console.error('Error fetching session:', error);
        setLoading(false);
        
        // Show error notification with retry button
        toast({
          title: t('connectionError') || 'Connection error',
          description: t('tryAgainLater') || 'Please try again later or check your connection',
          action: (
            <button 
              className="bg-orienteering hover:bg-orienteering/90 text-white py-1 px-3 rounded text-xs"
              onClick={refreshSupabaseConnection}
            >
              {t('retry') || 'Retry'}
            </button>
          )
        });
        return;
      }
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
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
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          throw error;
        }
        
        return data;
      };
      
      // Use retry mechanism
      const data = await fetchWithRetry(fetchProfile);
      
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
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchUserProfile after retries:', error);
      toast({
        title: t('error') || 'Error',
        description: t('profileFetchError') || 'Failed to fetch your profile. Please try again.',
        variant: 'destructive',
        action: (
          <button 
            className="bg-orienteering hover:bg-orienteering/90 text-white py-1 px-3 rounded text-xs"
            onClick={() => fetchUserProfile(userId)}
          >
            {t('retry') || 'Retry'}
          </button>
        )
      });
      setLoading(false);
    }
  };

  // Fetch leaderboard data with retry
  const fetchLeaderboard = async () => {
    try {
      const fetchLeaderboardData = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, name, accuracy, speed, profile_image')
          .order('accuracy', { ascending: false })
          .order('speed', { ascending: true })
          .limit(10);

        if (error) {
          throw error;
        }
        
        return data;
      };
      
      // Use retry mechanism
      const data = await fetchWithRetry(fetchLeaderboardData);

      if (data && data.length > 0) {
        // Add rank to each entry and map profile_image to profileImage
        const rankedLeaderboard = data.map((entry, index) => ({
          id: entry.id,
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
      // Don't show toast here as it could be too intrusive
      // Just keep the previous leaderboard state
    }
  };

  // Calculate user rank based on accuracy and speed
  const getUserRank = (): number => {
    if (!user || !user.attempts || user.attempts.total === 0) return 0;
    
    // Create a sorted copy of the leaderboard including the current user
    const fullLeaderboard = [...leaderboard];
    
    // Only add the user if they're not already in the leaderboard
    if (!fullLeaderboard.some(entry => entry.id === user.id)) {
      fullLeaderboard.push({
        id: user.id,
        name: user.name,
        accuracy: user.accuracy,
        speed: user.speed,
        profileImage: user.profileImage
      });
    }
    
    // Sort by accuracy first, then by speed (lower is better)
    fullLeaderboard.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy; // Higher accuracy is better
      }
      return a.speed - b.speed; // Lower speed (faster time) is better
    });
    
    // Assign ranks
    fullLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Find user's rank
    const userEntry = fullLeaderboard.find(entry => entry.id === user.id);
    return userEntry?.rank || 0;
  };

  // Update user performance
  const updatePerformance = async (isCorrect: boolean, responseTime: number) => {
    if (!user || !session) {
      console.warn('Cannot update performance: No authenticated user');
      return;
    }
    
    try {
      const attempts = user.attempts || { total: 0, correct: 0, timeSum: 0 };
      const newTotal = attempts.total + 1;
      const newCorrect = attempts.correct + (isCorrect ? 1 : 0);
      const newTimeSum = attempts.timeSum + (isCorrect ? responseTime : 0);
      
      // Calculate new accuracy and speed
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
      
      setUserState(updatedUser);
      
      // Update profile in database
      const { error } = await supabase
        .from('user_profiles')
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
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating performance data:', error);
      }
    } catch (error) {
      console.error('Error in updatePerformance:', error);
    }
  };

  // Update user profile
  const setUser = async (updatedUser: UserProfile) => {
    if (!session) {
      console.warn('Cannot update user: No authenticated session');
      return;
    }
    
    try {
      setUserState(updatedUser);
      
      const updateData: any = {
        name: updatedUser.name,
        updated_at: new Date().toISOString()
      };
      
      // Only update profile_image if it's present in the updated user
      if (updatedUser.profileImage !== undefined) {
        updateData.profile_image = updatedUser.profileImage;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', updatedUser.id);
        
      if (error) {
        console.error('Error updating user profile:', error);
      }
    } catch (error) {
      console.error('Error in setUser:', error);
    }
  };

  // Authentication methods with improved error handling
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const signInFn = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          throw error;
        }
        
        return data;
      };
      
      // Use retry mechanism
      await fetchWithRetry(signInFn);
      
      // Session will be updated by the onAuthStateChange listener
      // which will trigger fetchUserProfile
    } catch (error: any) {
      setLoading(false);
      
      // Check if it's a network error
      if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
        toast({
          title: t('connectionError') || 'Connection error',
          description: t('checkConnection') || 'Please check your internet connection and try again.',
          variant: 'destructive',
          action: (
            <button 
              className="bg-orienteering hover:bg-orienteering/90 text-white py-1 px-3 rounded text-xs"
              onClick={refreshSupabaseConnection}
            >
              {t('retry') || 'Retry'}
            </button>
          )
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
      
      // Session will be updated by the onAuthStateChange listener
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
        loading
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
