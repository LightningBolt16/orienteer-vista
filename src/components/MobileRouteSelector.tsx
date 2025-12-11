import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteData, MapSource, getImageUrlByMapName } from '../utils/routeDataUtils';
import { AspectRatio } from './ui/aspect-ratio';
import { useInactivityDetection } from '../hooks/useInactivityDetection';
import PauseOverlay from './PauseOverlay';

const PRELOAD_AHEAD_COUNT = 10;

export interface MobileRouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource | null;
  allMaps?: MapSource[];
  isFullscreen?: boolean;
}

const MobileRouteSelector: React.FC<MobileRouteSelectorProps> = ({ routeData, mapSource, allMaps = [], isFullscreen = false }) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [resultMessage, setResultMessage] = useState<string>('');
  const { updatePerformance } = useUser();
  const { t } = useLanguage();
  const resultTimeout = useRef<number | null>(null);
  const transitionTimeout = useRef<number | null>(null);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  // Inactivity detection
  const { isPaused, pauseReason, resume, resetTimer } = useInactivityDetection({
    inactivityTimeout: 30000, // 30 seconds
  });

  // Get image URL for a route (handles both single map and all maps mode)
  const getImageForRoute = (route: RouteData): string => {
    const mapName = route.mapName || mapSource?.name || '';
    return getImageUrlByMapName(mapName, route.candidateIndex, true);
  };

  // Preload images
  useEffect(() => {
    if (routeData.length === 0) return;
    
    const currentlyNeededImages = new Set<string>();
    
    for (let i = 0; i < PRELOAD_AHEAD_COUNT; i++) {
      const index = (currentRouteIndex + i) % routeData.length;
      const route = routeData[index];
      const imageUrl = getImageForRoute(route);
      currentlyNeededImages.add(imageUrl);
      
      if (!preloadedImages.current.has(imageUrl)) {
        const img = new Image();
        img.src = imageUrl;
        preloadedImages.current.set(imageUrl, img);
      }
    }
    
    preloadedImages.current.forEach((_, key) => {
      if (!currentlyNeededImages.has(key)) {
        preloadedImages.current.delete(key);
      }
    });
    
    return () => {
      if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routeData, mapSource, allMaps]);

  // Reset start time when resuming or changing route
  useEffect(() => {
    if (!isPaused) {
      setStartTime(Date.now());
    }
  }, [isPaused, currentRouteIndex]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning || routeData.length === 0 || isPaused) return;
    
    const currentRoute = routeData[currentRouteIndex];
    const isCorrect = direction === currentRoute.shortestSide;
    const responseTime = Date.now() - startTime;
    const mapName = currentRoute.mapName || mapSource?.name;
    
    // Reset inactivity timer on interaction
    resetTimer();
    
    updatePerformance(isCorrect, responseTime, mapName);
    
    if (isCorrect) {
      if (responseTime < 1000) {
        setResultMessage(t('excellent'));
      } else if (responseTime < 2000) {
        setResultMessage(t('good'));
      } else {
        setResultMessage(t('correct'));
      }
    } else {
      setResultMessage(t('wrong'));
    }
    
    setShowResult(isCorrect ? 'win' : 'lose');
    setIsTransitioning(true);
    
    if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    
    resultTimeout.current = window.setTimeout(() => {
      setShowResult(null);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentRouteIndex((currentRouteIndex + 1) % routeData.length);
        setIsTransitioning(false);
      }, 200);
    }, 400);
  };

  if (routeData.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading routes...</div>;
  }
  
  const currentRoute = routeData[currentRouteIndex];
  
  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64">Loading route data...</div>;
  }
  
  const currentImageUrl = getImageForRoute(currentRoute);
  
  const getColorValue = (colorStr: string): string => {
    if (colorStr.toLowerCase() === 'red') return '#FF5733';
    if (colorStr.toLowerCase() === 'blue') return '#3357FF';
    return colorStr;
  };
  
  const leftGlowColor = currentRoute.shortestSide === 'left' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');
    
  const rightGlowColor = currentRoute.shortestSide === 'right' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-full' : ''}`}>
      <div className={`overflow-hidden relative ${isFullscreen ? 'h-full bg-black' : 'glass-card'}`}>
        {/* Side glow effects */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-3 z-10 side-glow"
          style={{
            background: `linear-gradient(to right, ${leftGlowColor}99, transparent)`,
            boxShadow: `0 0 15px 0 ${leftGlowColor}88`
          }}
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-3 z-10 side-glow"
          style={{
            background: `linear-gradient(to left, ${rightGlowColor}99, transparent)`,
            boxShadow: `0 0 15px 0 ${rightGlowColor}88`
          }}
        />
        
        <div className={`relative overflow-hidden ${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
          {isFullscreen ? (
            <>
              <img 
                src={currentImageUrl} 
                alt="Orienteering route" 
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${!isTransitioning ? 'image-fade-in' : ''}`}
              />
              {showResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {showResult === 'win' ? (
                    <>
                      <CheckCircle className="text-green-500 w-20 h-20 sm:w-32 sm:h-32 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                      <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                        {resultMessage}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-500 w-20 h-20 sm:w-32 sm:h-32 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                      <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                        {resultMessage}
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isPaused && (
                <div className="absolute inset-0 flex">
                  <div 
                    className="w-1/2 h-full cursor-pointer" 
                    onClick={() => handleDirectionSelect('left')}
                  />
                  <div 
                    className="w-1/2 h-full cursor-pointer" 
                    onClick={() => handleDirectionSelect('right')}
                  />
                </div>
              )}
              {/* Pause Overlay */}
              {isPaused && (
                <PauseOverlay reason={pauseReason} onResume={resume} />
              )}
            </>
          ) : (
            <AspectRatio ratio={9/16}>
              <img 
                src={currentImageUrl} 
                alt="Orienteering route" 
                className={`w-full h-full object-contain transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${!isTransitioning ? 'image-fade-in' : ''}`}
              />
              {showResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {showResult === 'win' ? (
                    <>
                      <CheckCircle className="text-green-500 w-20 h-20 sm:w-32 sm:h-32 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                      <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                        {resultMessage}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-500 w-20 h-20 sm:w-32 sm:h-32 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                      <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                        {resultMessage}
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isPaused && (
                <div className="absolute inset-0 flex">
                  <div 
                    className="w-1/2 h-full cursor-pointer" 
                    onClick={() => handleDirectionSelect('left')}
                  />
                  <div 
                    className="w-1/2 h-full cursor-pointer" 
                    onClick={() => handleDirectionSelect('right')}
                  />
                </div>
              )}
              {/* Pause Overlay */}
              {isPaused && (
                <PauseOverlay reason={pauseReason} onResume={resume} />
              )}
            </AspectRatio>
          )}
        </div>
      </div>

      {currentRoute && !isFullscreen && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          <p>
            {currentRoute.mapName && <span className="font-medium">{currentRoute.mapName} - </span>}
            Route #{currentRoute.candidateIndex}
          </p>
        </div>
      )}
    </div>
  );
};

export default MobileRouteSelector;
