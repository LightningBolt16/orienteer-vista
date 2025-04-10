
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from './LanguageContext';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type User = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  profileImage?: string;
  attempts?: {
    total: number;
    correct: number;
    timeSum: number;
  };
};

type LeaderboardEntry = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  rank?: number;
};

interface UserContextType {
  user: User | null;
  leaderboard: LeaderboardEntry[];
  updatePerformance: (isCorrect: boolean, responseTime: number) => void;
  setUser: (user: User) => void;
  getUserRank: () => number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Fetch user and leaderboard data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      // Check for authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        // User is authenticated, fetch their profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileError);
          setLoading(false);
          return;
        }
        
        // If profile exists, use it, otherwise create default
        if (profile) {
          setUserState({
            id: session.user.id,
            name: profile.name || 'User',
            accuracy: profile.accuracy || 0,
            speed: profile.speed || 0,
            attempts: profile.attempts || {
              total: 0,
              correct: 0,
              timeSum: 0
            }
          });
        } else {
          // Create default profile for new user
          const defaultUser = {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            accuracy: 0,
            speed: 0,
            attempts: {
              total: 0,
              correct: 0,
              timeSum: 0
            }
          };
          
          setUserState(defaultUser);
          
          // Create profile in Supabase
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert([{
              id: session.user.id,
              name: defaultUser.name,
              accuracy: 0,
              speed: 0,
              attempts: {
                total: 0,
                correct: 0,
                timeSum: 0
              }
            }]);
            
          if (insertError) {
            console.error('Error creating user profile:', insertError);
          }
        }
      } else {
        // Use default guest profile if not authenticated
        setUserState({
          id: '1',
          name: 'Guest',
          accuracy: 0,
          speed: 0,
          attempts: {
            total: 0,
            correct: 0,
            timeSum: 0
          }
        });
      }
      
      // Fetch leaderboard data
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('user_profiles')
        .select('id, name, accuracy, speed')
        .order('accuracy', { ascending: false })
        .order('speed', { ascending: true })
        .limit(10);
        
      if (leaderboardError) {
        console.error('Error fetching leaderboard:', leaderboardError);
      } else if (leaderboardData.length > 0) {
        // Add rank to each entry
        const rankedLeaderboard = leaderboardData.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
        
        setLeaderboard(rankedLeaderboard);
      } else {
        // Default leaderboard if none exists
        setLeaderboard([
          { id: '2', name: 'Alice', accuracy: 92, speed: 850 },
          { id: '3', name: 'Bob', accuracy: 88, speed: 920 },
          { id: '4', name: 'Charlie', accuracy: 85, speed: 950 },
          { id: '5', name: 'Diana', accuracy: 80, speed: 1050 },
          { id: '6', name: 'Evan', accuracy: 78, speed: 1200 }
        ]);
      }
      
      setLoading(false);
    };
    
    fetchInitialData();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Refresh user data
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUserState({
            id: session.user.id,
            name: profile.name,
            accuracy: profile.accuracy,
            speed: profile.speed,
            attempts: profile.attempts
          });
        }
      } else if (event === 'SIGNED_OUT') {
        // Reset to guest user
        setUserState({
          id: '1',
          name: 'Guest',
          accuracy: 0,
          speed: 0,
          attempts: {
            total: 0,
            correct: 0,
            timeSum: 0
          }
        });
      }
    });
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Calculate user rank based on accuracy and speed
  const getUserRank = (): number => {
    if (!user || !user.attempts || user.attempts.total === 0) return 0;
    
    // Create a sorted copy of the leaderboard including the current user
    const fullLeaderboard = [...leaderboard];
    
    // Only add the user if they're not already in the leaderboard
    if (!fullLeaderboard.some(entry => entry.id === user.id) && user.id !== '1') {
      fullLeaderboard.push({
        id: user.id,
        name: user.name,
        accuracy: user.accuracy,
        speed: user.speed
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

  useEffect(() => {
    if (user && user.id !== '1') { // Don't update for guest user
      const updateUserProfile = async () => {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            name: user.name,
            accuracy: user.accuracy,
            speed: user.speed,
            attempts: user.attempts
          });
          
        if (error) {
          console.error('Error updating user profile:', error);
        }
      };
      
      updateUserProfile();
    }
  }, [user]);

  const updatePerformance = async (isCorrect: boolean, responseTime: number) => {
    if (user) {
      const attempts = user.attempts || { total: 0, correct: 0, timeSum: 0 };
      const newTotal = attempts.total + 1;
      const newCorrect = attempts.correct + (isCorrect ? 1 : 0);
      const newTimeSum = attempts.timeSum + (isCorrect ? responseTime : 0);
      
      // Calculate new accuracy (percentage of correct answers)
      const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
      
      // Calculate new speed (average response time in ms for correct answers only)
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
      
      // If user is authenticated, update their profile in Supabase
      if (user.id !== '1') {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            accuracy: newAccuracy,
            speed: newSpeed,
            attempts: {
              total: newTotal,
              correct: newCorrect,
              timeSum: newTimeSum
            }
          });
          
        if (error) {
          console.error('Error updating performance data:', error);
        }
      }
    }
  };

  const setUser = async (updatedUser: User) => {
    setUserState(updatedUser);
    
    // Update profile in Supabase if authenticated
    if (updatedUser.id !== '1') {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: updatedUser.id,
          name: updatedUser.name,
          accuracy: updatedUser.accuracy,
          speed: updatedUser.speed,
          attempts: updatedUser.attempts
        });
        
      if (error) {
        console.error('Error updating user profile:', error);
      }
    }
  };

  // Authentication methods
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      setLoading(false);
      toast({
        title: t('signInError'),
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
    
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    
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
        title: t('signUpError'),
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
    
    setLoading(false);
    
    toast({
      title: t('verifyEmail'),
      description: t('verifyEmailDescription')
    });
  };

  const signOut = async () => {
    setLoading(true);
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      toast({
        title: t('signOutError'),
        description: error.message,
        variant: 'destructive'
      });
    }
    
    setLoading(false);
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
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
