import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteData, MapSource, getImageUrlByMapName } from '../utils/routeDataUtils';

const PRELOAD_AHEAD_COUNT = 10;

export interface RouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource | null;
  allMaps?: MapSource[];
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ routeData, mapSource, allMaps = [] }) => {
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

  // Get image URL for a route (handles both single map and all maps mode)
  const getImageForRoute = (route: RouteData): string => {
    const mapName = route.mapName || mapSource?.name || '';
    return getImageUrlByMapName(mapName, route.candidateIndex, false);
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
    
    setStartTime(Date.now());
    
    return () => {
      if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routeData, mapSource, allMaps]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning || routeData.length === 0) return;
      
      if (e.key === 'ArrowLeft') {
        handleDirectionSelect('left');
      } else if (e.key === 'ArrowRight') {
        handleDirectionSelect('right');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRouteIndex, isTransitioning, routeData]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning || routeData.length === 0) return;
    
    const currentRoute = routeData[currentRouteIndex];
    const isCorrect = direction === currentRoute.shortestSide;
    const responseTime = Date.now() - startTime;
    
    updatePerformance(isCorrect, responseTime);
    
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
  
  const leftButtonColor = currentRoute.shortestSide === 'left' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');
    
  const rightButtonColor = currentRoute.shortestSide === 'right' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');

  return (
    <div className="relative w-full">
      <div className="glass-card overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img 
            src={currentImageUrl} 
            alt="Orienteering route" 
            className={`w-full h-full object-cover transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${!isTransitioning ? 'image-fade-in' : ''}`}
          />
          
          {showResult && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
              {showResult === 'win' ? (
                <>
                  <CheckCircle className="text-green-500 w-32 h-32 animate-[win-animation_0.4s_ease-out]" />
                  <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-bold animate-fade-in">
                    {resultMessage}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="text-red-500 w-32 h-32 animate-[lose-animation_0.4s_ease-out]" />
                  <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-bold animate-fade-in">
                    {resultMessage}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="absolute inset-x-0 bottom-0 p-6 flex justify-between">
            <button 
              onClick={() => handleDirectionSelect('left')} 
              style={{ backgroundColor: `${leftButtonColor}CC` }}
              className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              disabled={isTransitioning}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            
            <button 
              onClick={() => handleDirectionSelect('right')} 
              style={{ backgroundColor: `${rightButtonColor}CC` }}
              className="hover:bg-opacity-100 text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              disabled={isTransitioning}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
        </div>
      </div>

      {currentRoute && (
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
