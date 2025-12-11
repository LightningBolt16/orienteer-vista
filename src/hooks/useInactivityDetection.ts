import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInactivityDetectionOptions {
  inactivityTimeout?: number; // milliseconds before auto-pause
  onPause?: () => void;
  onResume?: () => void;
}

interface UseInactivityDetectionReturn {
  isPaused: boolean;
  pauseReason: 'inactivity' | 'visibility' | null;
  resume: () => void;
  resetTimer: () => void;
}

export const useInactivityDetection = ({
  inactivityTimeout = 30000, // 30 seconds default
  onPause,
  onResume,
}: UseInactivityDetectionOptions = {}): UseInactivityDetectionReturn => {
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<'inactivity' | 'visibility' | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      setIsPaused(true);
      setPauseReason('inactivity');
      onPause?.();
    }, inactivityTimeout);
  }, [inactivityTimeout, onPause, clearInactivityTimer]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isPaused) {
      startInactivityTimer();
    }
  }, [isPaused, startInactivityTimer]);

  const resume = useCallback(() => {
    setIsPaused(false);
    setPauseReason(null);
    lastActivityRef.current = Date.now();
    startInactivityTimer();
    onResume?.();
  }, [startInactivityTimer, onResume]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInactivityTimer();
        setIsPaused(true);
        setPauseReason('visibility');
        onPause?.();
      }
      // Don't auto-resume when page becomes visible - require user interaction
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearInactivityTimer, onPause]);

  // Handle user activity events
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      if (!isPaused) {
        resetTimer();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    startInactivityTimer();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInactivityTimer();
    };
  }, [isPaused, resetTimer, startInactivityTimer, clearInactivityTimer]);

  return {
    isPaused,
    pauseReason,
    resume,
    resetTimer,
  };
};
