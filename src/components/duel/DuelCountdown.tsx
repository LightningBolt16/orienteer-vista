import React, { useState, useEffect, useRef } from 'react';

interface DuelCountdownProps {
  onComplete: () => void;
  duration?: number;
}

const DuelCountdown: React.FC<DuelCountdownProps> = ({ onComplete, duration = 3 }) => {
  const [count, setCount] = useState(duration);
  const [showGo, setShowGo] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (count <= 0 && !showGo) {
      setShowGo(true);
      // Show "GO!" briefly then complete
      const goTimer = setTimeout(() => {
        onCompleteRef.current();
      }, 500);
      return () => clearTimeout(goTimer);
    }
    
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count, showGo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center">
        {!showGo ? (
          <div 
            key={count}
            className="text-[12rem] font-bold text-primary animate-pulse leading-none"
            style={{
              textShadow: '0 0 40px hsl(var(--primary) / 0.5)',
            }}
          >
            {count}
          </div>
        ) : (
          <div 
            className="text-8xl font-bold text-green-500 animate-bounce leading-none"
            style={{
              textShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
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
