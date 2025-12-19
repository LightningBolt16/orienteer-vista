import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteData, MapSource, getImageUrlByMapName } from '../utils/routeDataUtils';
import { useInactivityDetection } from '../hooks/useInactivityDetection';
import PauseOverlay from './PauseOverlay';

const PRELOAD_AHEAD_COUNT = 10;

export interface RouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource | null;
  allMaps?: MapSource[];
  isFullscreen?: boolean;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ routeData, mapSource, allMaps = [], isFullscreen = false }) => {
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isWarmUp, setIsWarmUp] = useState(true); // First attempt is warm-up, doesn't count
  const { updatePerformance } = useUser();
  const { t } = useLanguage();
  const resultTimeout = useRef<number | null>(null);
  const transitionTimeout = useRef<number | null>(null);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const previousRouteDataRef = useRef<RouteData[]>(routeData);

  // Inactivity detection
  const { isPaused, pauseReason, resume: baseResume, resetTimer } = useInactivityDetection({
    inactivityTimeout: 30000, // 30 seconds
  });

  // Resume and advance to next route so timer restarts fresh
  const handleResume = () => {
    setCurrentRouteIndex((prev) => (prev + 1) % routeData.length);
    baseResume();
  };

  // Get image URL for a route (handles both single map and all maps mode)
  const getImageForRoute = (route: RouteData): string => {
    const mapName = route.mapName || mapSource?.name || '';
    return getImageUrlByMapName(mapName, route.candidateIndex, false);
  };

  // Reset index when routeData changes (map switch)
  useEffect(() => {
    if (routeData !== previousRouteDataRef.current && routeData.length > 0) {
      setCurrentRouteIndex(0);
      setIsImageLoaded(false);
      setShowResult(null);
      setIsTransitioning(false);
      setIsWarmUp(true); // Reset warm-up on map switch
      setStartTime(null);
      previousRouteDataRef.current = routeData;
    }
  }, [routeData]);

  // Preload current image and wait for it to load
  useEffect(() => {
    if (routeData.length === 0) return;
    
    const currentRoute = routeData[currentRouteIndex];
    if (!currentRoute) return;
    
    const currentImageUrl = getImageForRoute(currentRoute);
    
    // Check if already preloaded
    const existingImg = preloadedImages.current.get(currentImageUrl);
    if (existingImg?.complete) {
      setIsImageLoaded(true);
    } else {
      setIsImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setIsImageLoaded(true);
        preloadedImages.current.set(currentImageUrl, img);
      };
      img.src = currentImageUrl;
    }
    
    // Preload upcoming images
    const currentlyNeededImages = new Set<string>();
    currentlyNeededImages.add(currentImageUrl);
    
    for (let i = 1; i < PRELOAD_AHEAD_COUNT; i++) {
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

  // Start timer only when image is loaded, not paused, and not transitioning
  useEffect(() => {
    if (!isPaused && isImageLoaded && !isTransitioning) {
      setStartTime(Date.now());
    }
  }, [isPaused, isImageLoaded, currentRouteIndex, isTransitioning]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning || routeData.length === 0 || isPaused) return;
      
      if (e.key === 'ArrowLeft') {
        handleDirectionSelect('left');
      } else if (e.key === 'ArrowRight') {
        handleDirectionSelect('right');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRouteIndex, isTransitioning, routeData, isPaused]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning || routeData.length === 0 || isPaused || startTime === null) return;
    
    const currentRoute = routeData[currentRouteIndex];
    const isCorrect = direction === currentRoute.shortestSide;
    const responseTime = Date.now() - startTime;
    const mapName = currentRoute.mapName || mapSource?.name;
    
    // Reset inactivity timer on interaction
    resetTimer();
    
    // Only record performance if not warm-up (first attempt after load/switch doesn't count)
    if (!isWarmUp) {
      updatePerformance(isCorrect, responseTime, mapName);
    } else {
      setIsWarmUp(false); // First attempt done, subsequent ones count
    }
    
    if (isWarmUp) {
      setResultMessage(t('warmUp') || 'Warm-up!');
    } else if (isCorrect) {
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
    
    // Set up preload for next image
    const nextIndex = (currentRouteIndex + 1) % routeData.length;
    const nextRoute = routeData[nextIndex];
    const nextImageUrl = getImageForRoute(nextRoute);
    
    const preloadNextImage = (): Promise<void> => {
      return new Promise((resolve) => {
        const existingImg = preloadedImages.current.get(nextImageUrl);
        if (existingImg?.complete) {
          resolve();
        } else {
          const img = new Image();
          img.onload = () => {
            preloadedImages.current.set(nextImageUrl, img);
            resolve();
          };
          img.onerror = () => resolve(); // Continue even if load fails
          img.src = nextImageUrl;
        }
      });
    };
    
    resultTimeout.current = window.setTimeout(async () => {
      // Wait for next image to be loaded before transitioning
      await preloadNextImage();
      setIsImageLoaded(true);
      setShowResult(null);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentRouteIndex(nextIndex);
        setIsTransitioning(false);
      }, 200);
    }, 400);
  };

  // Show loading if no routes
  if (routeData.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading routes...</div>;
  }
  
  const currentRoute = routeData[currentRouteIndex];
  
  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64">Loading route data...</div>;
  }
  
  const currentImageUrl = getImageForRoute(currentRoute);
  
  const RED_COLOR = '#FF5733';
  const BLUE_COLOR = '#3357FF';
  
  // Assign colors consistently: left is always red, right is always blue
  const leftButtonColor = RED_COLOR;
  const rightButtonColor = BLUE_COLOR;

  // Show result overlay while loading next image
  const showLoadingResult = !isImageLoaded && showResult;

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-full' : ''}`}>
      <div className={`overflow-hidden ${isFullscreen ? 'h-full bg-black' : 'glass-card'}`}>
        <div className={`relative overflow-hidden ${isFullscreen ? 'h-full flex items-center justify-center' : 'aspect-[16/9]'}`}>
          {/* Only show image when loaded and not in loading-result state */}
          {isImageLoaded && !showLoadingResult && (
            <img 
              src={currentImageUrl} 
              alt="Orienteering route" 
              className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${!isTransitioning ? 'image-fade-in' : ''} ${isFullscreen ? 'max-w-full max-h-full object-contain' : 'w-full h-full object-contain'}`}
            />
          )}
          
          {(showResult || showLoadingResult) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-background/80">
              {(showResult === 'win' || showLoadingResult === 'win') ? (
                <>
                  <CheckCircle className="text-green-500 w-32 h-32 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  <div className="mt-4 px-4 py-2 bg-green-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                    {resultMessage}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="text-red-500 w-32 h-32 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <div className="mt-4 px-4 py-2 bg-red-500/80 rounded-full text-white font-bold animate-fade-in shadow-lg">
                    {resultMessage}
                  </div>
                </>
              )}
            </div>
          )}
          
          {isImageLoaded && !showLoadingResult && (
            <div className="absolute inset-x-0 bottom-0 p-6 flex justify-between">
              <button 
                onClick={() => handleDirectionSelect('left')} 
                style={{ backgroundColor: `${leftButtonColor}CC` }}
                className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                disabled={isTransitioning || isPaused}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              
              <button 
                onClick={() => handleDirectionSelect('right')} 
                style={{ backgroundColor: `${rightButtonColor}CC` }}
                className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                disabled={isTransitioning || isPaused}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
          )}

          {/* Pause Overlay */}
          {isPaused && (
            <PauseOverlay reason={pauseReason} onResume={handleResume} />
          )}
        </div>
      </div>

      {currentRoute && !isFullscreen && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            {currentRoute.mapName && <span className="font-medium">{currentRoute.mapName} - </span>}
            Route #{currentRoute.candidateIndex} - Main {currentRoute.mainRouteLength.toFixed(0)}m vs Alt {currentRoute.altRouteLength.toFixed(0)}m
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;
