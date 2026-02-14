import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { RouteData, MapSource, getArrowColorForIndex } from '@/utils/routeDataUtils';
import PauseOverlay from './PauseOverlay';
import { useInactivityDetection } from '@/hooks/useInactivityDetection';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import SafeZoneImage from './map/SafeZoneImage';

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
    if (!currentRoute) return;
    
    const correctIndex = currentRoute.mainRouteIndex ?? 
      (currentRoute.shortestSide === 'left' ? 0 : 1);
    
    const isCorrect = selectedIndex === correctIndex;
    const responseTime = Date.now() - startTime;
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
      
      setPendingRouteIndex(nextIndex);
    }, 350);
  };

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
  if (!currentRoute) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  }
  const numAlternates = currentRoute.numAlternates || 1;
  const totalRoutes = 1 + numAlternates;

  const ROUTE_COLORS = ['#FF5733', '#3357FF', '#33CC33', '#9933FF'];

  const handleImageLoad = () => {
    if (pendingRouteIndex === null) {
      setIsImageLoaded(true);
    }
  };

  const renderResultOverlay = () => {
    if (!result) return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className={`text-center p-4 rounded-lg ${
          result === 'win' ? 'bg-green-500/90' : 
          result === 'lose' ? 'bg-red-500/90' : 
          'bg-yellow-500/90'
        }`}>
          {result === 'win' && <Check className="h-10 w-10 text-white mx-auto mb-1" />}
          {result === 'lose' && <X className="h-10 w-10 text-white mx-auto mb-1" />}
          <p className="text-white text-lg font-bold">{resultMessage}</p>
          {result === 'warmup' && (
            <p className="text-white/80 text-xs mt-1">
              Warmup {warmupCount}/{WARMUP_ROUTES}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderTouchZones = () => {
    if (result || !isImageLoaded || isTransitioning) return null;

    if (totalRoutes === 2) {
      return (
        <>
          <div
            className="absolute left-0 top-0 w-1/2 h-full z-10"
            onClick={() => handleDirectionSelect(0)}
          />
          <div
            className="absolute right-0 top-0 w-1/2 h-full z-10"
            onClick={() => handleDirectionSelect(1)}
          />
        </>
      );
    }

    return (
      <>
        <div
          className="absolute left-0 top-1/4 w-1/4 h-1/2 z-10"
          onClick={() => handleDirectionSelect(0)}
        />
        <div
          className="absolute right-0 top-1/4 w-1/4 h-1/2 z-10"
          onClick={() => handleDirectionSelect(1)}
        />
        <div
          className="absolute left-1/4 top-0 w-1/2 h-1/4 z-10"
          onClick={() => handleDirectionSelect(2)}
        />
        {totalRoutes >= 4 && (
          <div
            className="absolute left-1/4 bottom-0 w-1/2 h-1/4 z-10"
            onClick={() => handleDirectionSelect(3)}
          />
        )}
      </>
    );
  };

  const renderEdgeGlows = () => {
    if (result || !isImageLoaded) return null;
    if (totalRoutes === 2) {
      return (
        <>
          <div
            className="absolute left-0 top-0 w-16 h-full pointer-events-none z-10"
            style={{ background: `linear-gradient(90deg, ${ROUTE_COLORS[0]}25 0%, transparent 100%)` }}
          />
          <div
            className="absolute right-0 top-0 w-16 h-full pointer-events-none z-10"
            style={{ background: `linear-gradient(270deg, ${ROUTE_COLORS[1]}25 0%, transparent 100%)` }}
          />
        </>
      );
    }
    return null;
  };

  const renderArrowIndicators = () => {
    if (result || !isImageLoaded) return null;

    const getArrowStyle = (index: number): React.CSSProperties => {
      const base: React.CSSProperties = {
        backgroundColor: `${ROUTE_COLORS[index]}CC`,
        padding: '8px',
        borderRadius: '50%',
        position: 'absolute',
      };
      if (index === 0) return { ...base, left: '8px', top: '50%', transform: 'translateY(-50%)' };
      if (index === 1) return { ...base, right: '8px', top: '50%', transform: 'translateY(-50%)' };
      if (index === 2) return { ...base, left: '50%', top: '8px', transform: 'translateX(-50%)' };
      return { ...base, left: '50%', bottom: '8px', transform: 'translateX(-50%)' };
    };

    const getArrowRotation = (index: number) => {
      if (index === 0) return 'rotate-180';
      if (index === 1) return '';
      if (index === 2) return '-rotate-90';
      return 'rotate-90';
    };

    return (
      <>
        {Array.from({ length: totalRoutes }, (_, i) => (
          <div key={i} style={getArrowStyle(i)} className="pointer-events-none z-10">
            <svg
              className={`w-5 h-5 text-white ${getArrowRotation(i)}`}
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
        <div className="absolute inset-0">
          {/* Pause overlay */}
          {isPaused && <PauseOverlay reason={pauseReason} onResume={handleResume} />}
          {/* Edge glows */}
          {renderEdgeGlows()}
          {/* Touch zones */}
          {renderTouchZones()}
          {/* Arrow indicators */}
          {renderArrowIndicators()}
          {/* Result overlay — always centered in viewport */}
          {renderResultOverlay()}
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

        {/* Overlays on top */}
        {isPaused && <PauseOverlay reason={pauseReason} onResume={handleResume} />}
        {renderEdgeGlows()}
        {renderTouchZones()}
        {renderArrowIndicators()}
        {renderResultOverlay()}
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

export default MobileRouteSelector;
