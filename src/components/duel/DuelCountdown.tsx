import React, { useState, useEffect, useRef } from 'react';

interface DuelCountdownProps {
  onComplete: () => void;
  duration?: number;
}

const DuelCountdown: React.FC<DuelCountdownProps> = ({ onComplete, duration = 3 }) => {
  const [count, setCount] = useState(duration);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Countdown timer
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  // Handle completion separately - only when count reaches 0
  useEffect(() => {
    if (count === 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Show "GO!" for 500ms then complete
      const goTimer = setTimeout(() => {
        onCompleteRef.current();
      }, 500);
      return () => clearTimeout(goTimer);
    }
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="text-center">
        {count > 0 ? (
          <div 
            key={count}
            className="text-[12rem] font-bold text-white leading-none animate-scale-in"
            style={{
              textShadow: '0 0 60px hsl(var(--primary)), 0 0 120px hsl(var(--primary) / 0.5)',
            }}
          >
            {count}
          </div>
        ) : (
          <div 
            className="text-8xl font-bold text-green-400 leading-none animate-scale-in"
            style={{
              textShadow: '0 0 60px rgba(74, 222, 128, 0.8), 0 0 120px rgba(74, 222, 128, 0.4)',
            }}
          >
            GO!
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelCountdown;
