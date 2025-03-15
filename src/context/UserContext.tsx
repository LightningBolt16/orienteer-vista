
import React, { createContext, useContext, useState, useEffect } from 'react';

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
      accuracy: 0,
      speed: 0,
      attempts: {
        total: 0,
        correct: 0,
        timeSum: 0
      }
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const savedLeaderboard = localStorage.getItem('orienteering-leaderboard');
    return savedLeaderboard ? JSON.parse(savedLeaderboard) : [
      { id: '2', name: 'Alice', accuracy: 92, speed: 850 },
      { id: '3', name: 'Bob', accuracy: 88, speed: 920 },
      { id: '4', name: 'Charlie', accuracy: 85, speed: 950 },
      { id: '5', name: 'Diana', accuracy: 80, speed: 1050 },
      { id: '6', name: 'Evan', accuracy: 78, speed: 1200 }
    ];
  });

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
    if (user) {
      localStorage.setItem('orienteering-user', JSON.stringify(user));
      
      // Update leaderboard with current user
      if (user.id !== '1' && user.attempts && user.attempts.total > 0) { // Don't add default user or users with no attempts
        const existingUserIndex = leaderboard.findIndex(entry => entry.id === user.id);
        let newLeaderboard = [...leaderboard];
        
        if (existingUserIndex >= 0) {
          newLeaderboard[existingUserIndex] = {
            id: user.id,
            name: user.name,
            accuracy: user.accuracy,
            speed: user.speed
          };
        } else {
          newLeaderboard.push({
            id: user.id,
            name: user.name,
            accuracy: user.accuracy,
            speed: user.speed
          });
        }
        
        // Sort by accuracy first, then by speed (lower is better)
        newLeaderboard.sort((a, b) => {
          if (a.accuracy !== b.accuracy) {
            return b.accuracy - a.accuracy; // Higher accuracy is better
          }
          return a.speed - b.speed; // Lower speed (faster time) is better
        });
        
        // Assign ranks
        newLeaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });
        
        setLeaderboard(newLeaderboard);
        localStorage.setItem('orienteering-leaderboard', JSON.stringify(newLeaderboard));
      }
    }
  }, [user]);

  const updatePerformance = (isCorrect: boolean, responseTime: number) => {
    if (user) {
      const attempts = user.attempts || { total: 0, correct: 0, timeSum: 0 };
      const newTotal = attempts.total + 1;
      const newCorrect = attempts.correct + (isCorrect ? 1 : 0);
      const newTimeSum = attempts.timeSum + (isCorrect ? responseTime : 0);
      
      // Calculate new accuracy (percentage of correct answers)
      const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
      
      // Calculate new speed (average response time in ms for correct answers only)
      const newSpeed = newCorrect > 0 ? Math.round(newTimeSum / newCorrect) : 0;
      
      setUserState({
        ...user,
        accuracy: newAccuracy,
        speed: newSpeed,
        attempts: {
          total: newTotal,
          correct: newCorrect,
          timeSum: newTimeSum
        }
      });
    }
  };

  const setUser = (updatedUser: User) => {
    setUserState(updatedUser);
  };

  return (
    <UserContext.Provider value={{ user, leaderboard, updatePerformance, setUser, getUserRank }}>
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
