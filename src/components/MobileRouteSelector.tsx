import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { RouteData, MapSource, getArrowColorForIndex } from '@/utils/routeDataUtils';
import PauseOverlay from './PauseOverlay';
import { useInactivityDetection } from '@/hooks/useInactivityDetection';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface MobileRouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource | null;
  allMaps?: MapSource[];
  isFullscreen?: boolean;
}

const MobileRouteSelector: React.FC<MobileRouteSelectorProps> = ({
  routeData,
  mapSource,
  isFullscreen = false
}) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'warmup' | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [warmupCount, setWarmupCount] = useState(0);
  const [pendingRouteIndex, setPendingRouteIndex] = useState<number | null>(null);
  const [preloadPool, setPreloadPool] = useState<number[]>([]);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const { user } = useUser();

  const WARMUP_ROUTES = 3;
  const PRELOAD_COUNT = 10;

  const { isPaused, pauseReason, resume, resetTimer } = useInactivityDetection({
    inactivityTimeout: 30000,
  });

  // Reset on route data change and initialize preload pool
  useEffect(() => {
    setCurrentRouteIndex(0);
    setIsTransitioning(false);
    setResult(null);
    setResultMessage('');
    setWarmupCount(0);
    preloadedImages.current.clear();
    
    // Initialize pool with PRELOAD_COUNT random indices
    if (routeData.length > 0) {
      const indices = routeData.map((_, i) => i);
      const shuffled = [...indices].sort(() => Math.random() - 0.5);
      const initialPool = shuffled.slice(0, Math.min(PRELOAD_COUNT, routeData.length));
      setPreloadPool(initialPool);
    }
  }, [routeData]);

  // Preload all images in the pool
  useEffect(() => {
    if (preloadPool.length === 0 || routeData.length === 0) return;

    preloadPool.forEach(index => {
      const route = routeData[index];
      const imageUrl = route?.imagePath || '';
      if (imageUrl && !preloadedImages.current.has(imageUrl)) {
        const img = new Image();
        img.src = imageUrl;
        preloadedImages.current.set(imageUrl, img);
      }
    });
  }, [preloadPool, routeData]);

  // Start timer when image loads
  useEffect(() => {
    if (isImageLoaded && !isPaused && !isTransitioning) {
      setStartTime(Date.now());
    }
  }, [isImageLoaded, isPaused, isTransitioning, currentRouteIndex]);

  const recordAttempt = async (isCorrect: boolean, responseTime: number, mapName: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('route_attempts').insert({
        user_id: user.id,
        is_correct: isCorrect,
        response_time: responseTime,
        map_name: mapName,
      });
    } catch (error) {
      console.error('Failed to record attempt:', error);
    }
  };

  const handleDirectionSelect = (selectedIndex: number) => {
    if (isTransitioning || routeData.length === 0 || isPaused || startTime === null) return;
    
    const currentRoute = routeData[currentRouteIndex];
    const numAlternates = currentRoute.numAlternates || 1;
    
    // Get the correct answer index
    const correctIndex = currentRoute.mainRouteIndex ?? 
      (currentRoute.shortestSide === 'left' ? 0 : 1);
    
    const isCorrect = selectedIndex === correctIndex;
    const responseTime = Date.now() - startTime;
    const mapName = currentRoute.mapName || mapSource?.name;
    
    // Reset inactivity timer on interaction
    resetTimer();

    // Handle warmup period
    if (warmupCount < WARMUP_ROUTES) {
      setWarmupCount(prev => prev + 1);
      setResult('warmup');
      setResultMessage(isCorrect ? 'Nice!' : 'Keep practicing!');
    } else {
      // Record actual attempt
      if (mapName) {
        recordAttempt(isCorrect, responseTime, mapName);
      }
      setResult(isCorrect ? 'win' : 'lose');
      setResultMessage(isCorrect ? 'Correct!' : 'Wrong!');
    }

    setIsTransitioning(true);

    setTimeout(() => {
      // Pick next route FROM the preloaded pool
      let nextIndex: number;
      if (preloadPool.length > 0) {
        const poolIndex = Math.floor(Math.random() * preloadPool.length);
        nextIndex = preloadPool[poolIndex];
        
        // Remove used index and add a new random one
        setPreloadPool(prev => {
          const newPool = prev.filter((_, i) => i !== poolIndex);
          const available = routeData
            .map((_, i) => i)
            .filter(i => !newPool.includes(i) && i !== nextIndex);
          if (available.length > 0) {
            const newIndex = available[Math.floor(Math.random() * available.length)];
            newPool.push(newIndex);
          }
          return newPool;
        });
      } else {
        // Fallback to pure random if pool is empty
        nextIndex = Math.floor(Math.random() * routeData.length);
      }
      
      setPendingRouteIndex(nextIndex);
    }, 350);
  };

  // Complete transition when pending image is loaded
  useEffect(() => {
    if (pendingRouteIndex !== null && isImageLoaded) {
      setCurrentRouteIndex(pendingRouteIndex);
      setPendingRouteIndex(null);
      setResult(null);
      setResultMessage('');
      setIsTransitioning(false);
    }
  }, [isImageLoaded, pendingRouteIndex]);

  const handleResume = () => {
    resume();
    setStartTime(Date.now());
  };

  if (routeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading routes...</p>
      </div>
    );
  }

  const currentRoute = routeData[currentRouteIndex];
  const numAlternates = currentRoute.numAlternates || 1;
  const totalRoutes = 1 + numAlternates;
  const mainRouteIndex = currentRoute.mainRouteIndex ?? (currentRoute.shortestSide === 'left' ? 0 : 1);

  // Define colors for routes
  const ROUTE_COLORS = ['#FF5733', '#3357FF', '#33CC33', '#9933FF']; // Red, Blue, Green, Purple

  // Render touch zones: Red=Left, Blue=Right, Green=Up, Purple=Down
  const renderTouchZones = () => {
    if (totalRoutes === 2) {
      // Traditional left/right split
      return (
        <>
          <div
            className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
            onClick={() => handleDirectionSelect(0)}
            style={{ 
              background: `linear-gradient(90deg, ${ROUTE_COLORS[0]}20 0%, transparent 100%)` 
            }}
          />
          <div
            className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
            onClick={() => handleDirectionSelect(1)}
            style={{ 
              background: `linear-gradient(270deg, ${ROUTE_COLORS[1]}20 0%, transparent 100%)` 
            }}
          />
        </>
      );
    }

    // 3-4 routes: Left, Right, Up, (Down)
    return (
      <>
        {/* Left zone - Red (index 0) */}
        <div
          className="absolute left-0 top-1/4 w-1/4 h-1/2 cursor-pointer rounded-r-lg"
          onClick={() => handleDirectionSelect(0)}
          style={{ 
            background: `linear-gradient(90deg, ${ROUTE_COLORS[0]}30 0%, transparent 100%)` 
          }}
        />
        {/* Right zone - Blue (index 1) */}
        <div
          className="absolute right-0 top-1/4 w-1/4 h-1/2 cursor-pointer rounded-l-lg"
          onClick={() => handleDirectionSelect(1)}
          style={{ 
            background: `linear-gradient(270deg, ${ROUTE_COLORS[1]}30 0%, transparent 100%)` 
          }}
        />
        {/* Up zone - Green (index 2) */}
        <div
          className="absolute left-1/4 top-0 w-1/2 h-1/4 cursor-pointer rounded-b-lg"
          onClick={() => handleDirectionSelect(2)}
          style={{ 
            background: `linear-gradient(180deg, ${ROUTE_COLORS[2]}30 0%, transparent 100%)` 
          }}
        />
        {/* Down zone - Purple (index 3) - only for 4 routes */}
        {totalRoutes >= 4 && (
          <div
            className="absolute left-1/4 bottom-0 w-1/2 h-1/4 cursor-pointer rounded-t-lg"
            onClick={() => handleDirectionSelect(3)}
            style={{ 
              background: `linear-gradient(0deg, ${ROUTE_COLORS[3]}30 0%, transparent 100%)` 
            }}
          />
        )}
      </>
    );
  };

  // Render arrow indicators: Red=Left, Blue=Right, Green=Up, Purple=Down
  const renderArrowIndicators = () => {
    const getArrowStyle = (index: number) => {
      const baseStyle = {
        backgroundColor: `${ROUTE_COLORS[index]}CC`,
        padding: '8px',
        borderRadius: '50%',
        position: 'absolute' as const,
      };

      // Position: 0=Left, 1=Right, 2=Up, 3=Down
      if (index === 0) return { ...baseStyle, left: '8px', top: '50%', transform: 'translateY(-50%)' };
      if (index === 1) return { ...baseStyle, right: '8px', top: '50%', transform: 'translateY(-50%)' };
      if (index === 2) return { ...baseStyle, left: '50%', top: '8px', transform: 'translateX(-50%)' };
      return { ...baseStyle, left: '50%', bottom: '8px', transform: 'translateX(-50%)' };
    };

    const getArrowRotation = (index: number) => {
      if (index === 0) return 'rotate-180'; // Left arrow
      if (index === 1) return ''; // Right arrow
      if (index === 2) return '-rotate-90'; // Up arrow
      return 'rotate-90'; // Down arrow
    };

    return (
      <>
        {Array.from({ length: totalRoutes }, (_, i) => (
          <div key={i} style={getArrowStyle(i)} className="pointer-events-none">
            <svg
              className={`w-6 h-6 text-white ${getArrowRotation(i)}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className={`relative ${isFullscreen ? 'h-screen w-screen bg-black flex items-center justify-center' : ''}`}>
      {isPaused && <PauseOverlay reason={pauseReason} onResume={handleResume} />}
      
      <div className={`relative ${isFullscreen ? 'w-full h-full flex items-center justify-center' : ''}`}>
        {/* Route Image */}
        <img
          src={currentRoute.imagePath}
          alt={`Route ${currentRoute.candidateIndex}`}
          className={isFullscreen 
            ? 'max-w-full max-h-full w-auto h-auto object-contain' 
            : 'w-full h-auto'
          }
          onLoad={() => {
            if (pendingRouteIndex === null) {
              setIsImageLoaded(true);
            }
          }}
        />
        
        {/* Hidden preload image for pending route */}
        {pendingRouteIndex !== null && routeData[pendingRouteIndex] && (
          <img
            src={routeData[pendingRouteIndex].imagePath}
            alt="preload"
            className="hidden"
            onLoad={() => setIsImageLoaded(true)}
          />
        )}

        {/* Touch Zones */}
        {!result && isImageLoaded && !isTransitioning && renderTouchZones()}

        {/* Arrow Indicators */}
        {!result && isImageLoaded && renderArrowIndicators()}

        {/* Result Overlay */}
        {result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className={`text-center p-6 rounded-lg ${
              result === 'win' ? 'bg-green-500/90' : 
              result === 'lose' ? 'bg-red-500/90' : 
              'bg-yellow-500/90'
            }`}>
              {result === 'win' && <Check className="h-16 w-16 text-white mx-auto mb-2" />}
              {result === 'lose' && <X className="h-16 w-16 text-white mx-auto mb-2" />}
              <p className="text-white text-xl font-bold">{resultMessage}</p>
              {result === 'warmup' && (
                <p className="text-white/80 text-sm mt-1">
                  Warmup {warmupCount}/{WARMUP_ROUTES}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Route Info - no colored dots that reveal answer */}
      {!isFullscreen && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {warmupCount < WARMUP_ROUTES 
                ? `Warmup: ${WARMUP_ROUTES - warmupCount} remaining`
                : `Route ${currentRouteIndex + 1}/${routeData.length}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileRouteSelector;
