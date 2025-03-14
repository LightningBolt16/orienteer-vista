
import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  points: number;
  profileImage?: string;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  points: number;
};

interface UserContextType {
  user: User | null;
  leaderboard: LeaderboardEntry[];
  addPoints: (points: number) => void;
  setUser: (user: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('orienteering-user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    
    // Default user
    return {
      id: '1',
      name: 'Guest',
      points: 0,
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const savedLeaderboard = localStorage.getItem('orienteering-leaderboard');
    return savedLeaderboard ? JSON.parse(savedLeaderboard) : [
      { id: '2', name: 'Alice', points: 120 },
      { id: '3', name: 'Bob', points: 115 },
      { id: '4', name: 'Charlie', points: 98 },
      { id: '5', name: 'Diana', points: 87 },
      { id: '6', name: 'Evan', points: 76 }
    ];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('orienteering-user', JSON.stringify(user));
      
      // Update leaderboard with current user
      const existingUserIndex = leaderboard.findIndex(entry => entry.id === user.id);
      let newLeaderboard = [...leaderboard];
      
      if (existingUserIndex >= 0) {
        newLeaderboard[existingUserIndex] = {
          id: user.id,
          name: user.name,
          points: user.points
        };
      } else if (user.id !== '1') { // Don't add default user to leaderboard
        newLeaderboard.push({
          id: user.id,
          name: user.name,
          points: user.points
        });
      }
      
      // Sort leaderboard by points
      newLeaderboard.sort((a, b) => b.points - a.points);
      
      setLeaderboard(newLeaderboard);
      localStorage.setItem('orienteering-leaderboard', JSON.stringify(newLeaderboard));
    }
  }, [user]);

  const addPoints = (points: number) => {
    if (user) {
      setUserState({
        ...user,
        points: user.points + points
      });
    }
  };

  const setUser = (updatedUser: User) => {
    setUserState(updatedUser);
  };

  return (
    <UserContext.Provider value={{ user, leaderboard, addPoints, setUser }}>
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
