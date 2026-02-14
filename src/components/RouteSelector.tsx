import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { RouteData, MapSource, getArrowColorForIndex } from '@/utils/routeDataUtils';
import PauseOverlay from './PauseOverlay';
import { useInactivityDetection } from '@/hooks/useInactivityDetection';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import SafeZoneImage from './map/SafeZoneImage';

interface RouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource | null;
  allMaps?: MapSource[];
  isFullscreen?: boolean;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({
  routeData,
  mapSource,
  allMaps,
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

  const handleDirectionSelect = useCallback((selectedIndex: number) => {
    if (isTransitioning || routeData.length === 0 || isPaused) return;
    
    const currentRoute = routeData[currentRouteIndex];
    const correctIndex = currentRoute.mainRouteIndex ?? 
      (currentRoute.shortestSide === 'left' ? 0 : 1);
    
    const isCorrect = selectedIndex === correctIndex;
    const responseTime = startTime ? Date.now() - startTime : 0;
    const mapName = currentRoute.mapName || mapSource?.name;
    
    resetTimer();

    if (warmupCount < WARMUP_ROUTES) {
      setWarmupCount(prev => prev + 1);
      setResult('warmup');
      setResultMessage(isCorrect ? 'Nice!' : 'Keep practicing!');
    } else {
      if (mapName) {
        recordAttempt(isCorrect, responseTime, mapName);
      }
      setResult(isCorrect ? 'win' : 'lose');
      setResultMessage(isCorrect ? 'Correct!' : 'Wrong!');
    }

    setIsTransitioning(true);

    setTimeout(() => {
      let nextIndex: number;
      if (preloadPool.length > 0) {
        const poolIndex = Math.floor(Math.random() * preloadPool.length);
        nextIndex = preloadPool[poolIndex];
        
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
        nextIndex = Math.floor(Math.random() * routeData.length);
      }
      
      // Reset isImageLoaded BEFORE setting pendingRouteIndex to prevent
      // the transition effect from firing immediately with stale state
      setIsImageLoaded(false);
      setPendingRouteIndex(nextIndex);
    }, 350);
  }, [isTransitioning, routeData, isPaused, currentRouteIndex, startTime, mapSource, resetTimer, warmupCount, preloadPool]);

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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isTransitioning) return;
      
      const currentRoute = routeData[currentRouteIndex];
      if (!currentRoute) return;
      
      const numAlternates = currentRoute.numAlternates || 1;
      const totalRoutes = 1 + numAlternates;
      
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleDirectionSelect(0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleDirectionSelect(1); }
      else if (e.key === 'ArrowUp' && totalRoutes >= 3) { e.preventDefault(); handleDirectionSelect(2); }
      else if (e.key === 'ArrowDown' && totalRoutes >= 4) { e.preventDefault(); handleDirectionSelect(3); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, isTransitioning, currentRouteIndex, routeData, handleDirectionSelect]);

  if (routeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading routes...</p>
      </div>
    );
  }

  const currentRoute = routeData[currentRouteIndex];
  if (!currentRoute) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }
  const numAlternates = currentRoute.numAlternates || 1;
  const totalRoutes = 1 + numAlternates;

  const ROUTE_COLORS = ['#FF5733', '#3357FF', '#33CC33', '#9933FF'];

  const renderResultOverlay = (iconSize = 'h-16 w-16', textSize = 'text-xl') => {
    if (!result) return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className={`text-center p-6 rounded-lg ${
          result === 'win' ? 'bg-green-500/90' : 
          result === 'lose' ? 'bg-red-500/90' : 
          'bg-yellow-500/90'
        }`}>
          {result === 'win' && <Check className={`${iconSize} text-white mx-auto mb-2`} />}
          {result === 'lose' && <X className={`${iconSize} text-white mx-auto mb-2`} />}
          <p className={`text-white ${textSize} font-bold`}>{resultMessage}</p>
          {result === 'warmup' && (
            <p className="text-white/80 text-sm mt-1">
              Warmup {warmupCount}/{WARMUP_ROUTES}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderArrowButtons = () => {
    if (totalRoutes === 2) {
      return (
        <>
          <button 
            onClick={() => handleDirectionSelect(0)} 
            style={{ backgroundColor: `${ROUTE_COLORS[0]}CC` }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10"
            disabled={isTransitioning || isPaused}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button 
            onClick={() => handleDirectionSelect(1)} 
            style={{ backgroundColor: `${ROUTE_COLORS[1]}CC` }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10"
            disabled={isTransitioning || isPaused}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      );
    }

    const getArrowIcon = (index: number) => {
      if (index === 0) return <ChevronLeft className="h-8 w-8" />;
      if (index === 1) return <ChevronRight className="h-8 w-8" />;
      if (index === 2) return <ChevronUp className="h-8 w-8" />;
      return <ChevronDown className="h-8 w-8" />;
    };

    const getButtonPosition = (index: number) => {
      if (index === 0) return 'left-4 top-1/2 -translate-y-1/2';
      if (index === 1) return 'right-4 top-1/2 -translate-y-1/2';
      if (index === 2) return 'left-1/2 top-4 -translate-x-1/2';
      return 'left-1/2 bottom-4 -translate-x-1/2';
    };

    return (
      <>
        {Array.from({ length: totalRoutes }, (_, i) => (
          <button
            key={i}
            onClick={() => handleDirectionSelect(i)}
            style={{ backgroundColor: `${ROUTE_COLORS[i]}CC` }}
            className={`absolute ${getButtonPosition(i)} text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10`}
            disabled={isTransitioning || isPaused}
          >
            {getArrowIcon(i)}
          </button>
        ))}
      </>
    );
  };

  const handleImageLoad = () => {
    if (pendingRouteIndex === null) {
      setIsImageLoaded(true);
    }
  };

  const is1x1 = currentRoute.sourceAspect === '1:1';

  // === FULLSCREEN MODE ===
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        {/* Layer 1: Image (with zoom transform) */}
        {is1x1 ? (
          <SafeZoneImage
            src={currentRoute.imagePath || ''}
            isFullscreen
            safeZone={currentRoute.safeZone}
            alt={`Route ${currentRoute.candidateIndex}`}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={currentRoute.imagePath}
              alt={`Route ${currentRoute.candidateIndex}`}
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
            />
          </div>
        )}

        {/* Layer 2: UI overlay (NO transform, fixed to viewport) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Pause overlay */}
          {isPaused && (
            <div className="pointer-events-auto">
              <PauseOverlay reason={pauseReason} onResume={handleResume} />
            </div>
          )}
          {/* Result overlay — always centered in viewport */}
          {renderResultOverlay()}
          {/* Arrow buttons — always at viewport edges */}
          {!result && isImageLoaded && (
            <div className="pointer-events-auto">
              {renderArrowButtons()}
            </div>
          )}
        </div>

        {/* Hidden preload */}
        {pendingRouteIndex !== null && routeData[pendingRouteIndex] && (
          <img
            src={routeData[pendingRouteIndex].imagePath}
            alt="preload"
            className="hidden"
            onLoad={() => setIsImageLoaded(true)}
          />
        )}
      </div>
    );
  }

  // === NON-FULLSCREEN MODE ===
  return (
    <div className="relative">
      <div className="relative">
        {is1x1 ? (
          <SafeZoneImage
            src={currentRoute.imagePath || ''}
            isFullscreen={false}
            safeZone={currentRoute.safeZone}
            alt={`Route ${currentRoute.candidateIndex}`}
            onLoad={handleImageLoad}
          />
        ) : (
          <img
            src={currentRoute.imagePath}
            alt={`Route ${currentRoute.candidateIndex}`}
            className="w-full h-auto"
            onLoad={handleImageLoad}
          />
        )}

        {/* Overlays sit on top of the image container */}
        {isPaused && <PauseOverlay reason={pauseReason} onResume={handleResume} />}
        {renderResultOverlay()}
        {!result && isImageLoaded && renderArrowButtons()}
      </div>

      {pendingRouteIndex !== null && routeData[pendingRouteIndex] && (
        <img
          src={routeData[pendingRouteIndex].imagePath}
          alt="preload"
          className="hidden"
          onLoad={() => setIsImageLoaded(true)}
        />
      )}

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {warmupCount < WARMUP_ROUTES 
              ? `Warmup: ${WARMUP_ROUTES - warmupCount} remaining`
              : `Route ${currentRouteIndex + 1}/${routeData.length}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RouteSelector;
