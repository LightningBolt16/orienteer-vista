
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from './LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/types';
import { v4 as uuidv4 } from 'uuid';
import { Club, UserRole, ClubRole } from '../types/club';
import { getClubsWithMemberCount, leaveClub } from '../helpers/supabaseQueries';

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
  role?: UserRole;
  clubId?: string;
  clubName?: string;
  clubRole?: ClubRole;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  accuracy: number;
  speed: number;
  role?: string;
  rank?: number;
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
  fetchUserProfile: () => Promise<void>;
  fetchClubs: () => Promise<Club[]>;
  leaveClub: () => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
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

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId?: string) => {
    try {
      const uid = userId || session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      // Fetch user profile directly
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }

      // For development/demo purposes, let's imagine we have these additional fields
      // In production, these would come from real database queries
      const mockProfileData = {
        profileImage: 'https://placehold.co/200x200?text=User',
        role: 'beginner' as UserRole,
        clubId: '1', // Default to Täby OK
        clubName: 'Täby OK',
        clubRole: 'member' as ClubRole
      };

      if (data) {
        const userProfile: UserProfile = {
          id: uid,
          name: data.name || 'User',
          accuracy: data.accuracy || 0,
          speed: data.speed || 0,
          attempts: data.attempts as { total: number; correct: number; timeSum: number } || {
            total: 0,
            correct: 0,
            timeSum: 0
          },
          // Add mock data for development
          profileImage: mockProfileData.profileImage,
          role: mockProfileData.role,
          clubId: mockProfileData.clubId,
          clubName: mockProfileData.clubName,
          clubRole: mockProfileData.clubRole
        };
        
        setUserState(userProfile);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setLoading(false);
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, accuracy, speed')
        .order('accuracy', { ascending: false })
        .order('speed', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      if (data && data.length > 0) {
        // Add rank to each entry
        const rankedLeaderboard = data.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
        
        setLeaderboard(rankedLeaderboard);
      }
    } catch (error) {
      console.error('Error in fetchLeaderboard:', error);
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
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: updatedUser.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedUser.id);
        
      if (error) {
        console.error('Error updating user profile:', error);
      }
    } catch (error) {
      console.error('Error in setUser:', error);
    }
  };

  // Fetch available clubs
  const fetchClubs = async (): Promise<Club[]> => {
    try {
      // Import from helpers to use our mock data
      return await getClubsWithMemberCount();
    } catch (error) {
      console.error('Error in fetchClubs:', error);
      return [];
    }
  };

  // Leave current club
  const leaveCurrentClub = async (): Promise<boolean> => {
    if (!user || !session || !user.clubId) {
      return false;
    }
    
    try {
      const success = await leaveClub(user.id);
      
      if (success) {
        // Update local state
        setUserState({
          ...user,
          clubId: undefined,
          clubName: undefined,
          clubRole: undefined
        });
        
        toast({
          title: t('success'),
          description: t('leftClub')
        });
      }
      
      return success;
    } catch (error: any) {
      console.error('Error leaving club:', error);
      toast({
        title: t('error'),
        description: error.message || t('errorLeavingClub'),
        variant: 'destructive'
      });
      return false;
    }
  };

  // Authentication methods
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
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
      
      // Session will be updated by the onAuthStateChange listener
      // which will trigger fetchUserProfile
    } catch (error: any) {
      setLoading(false);
      toast({
        title: t('signInError'),
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
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
    } catch (error: any) {
      setLoading(false);
      toast({
        title: t('signUpError'),
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
          title: t('signOutError'),
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
        title: t('signOutError'),
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
        fetchUserProfile,
        fetchClubs,
        leaveClub: leaveCurrentClub
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
