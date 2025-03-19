
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { RouteData, MapSource, getImageUrl } from '../utils/routeDataUtils';

// Number of images to preload ahead of the current image
const PRELOAD_AHEAD_COUNT = 10;

interface RouteSelectorProps {
  routeData: RouteData[];
  mapSource: MapSource;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ routeData, mapSource }) => {
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

  // Preload images when routeData changes or currentRouteIndex changes
  useEffect(() => {
    if (routeData.length === 0 || !mapSource) return;
    
    // Clear old preloaded images to prevent memory issues
    const currentlyNeededImages = new Set<string>();
    
    // Preload current image and PRELOAD_AHEAD_COUNT images ahead
    for (let i = 0; i < PRELOAD_AHEAD_COUNT; i++) {
      const index = (currentRouteIndex + i) % routeData.length;
      const candidateIndex = routeData[index].candidateIndex;
      const imageUrl = getImageUrl(mapSource, candidateIndex, false);
      currentlyNeededImages.add(imageUrl);
      
      // If we haven't preloaded this image yet, preload it
      if (!preloadedImages.current.has(imageUrl)) {
        const img = new Image();
        img.src = imageUrl;
        preloadedImages.current.set(imageUrl, img);
      }
    }
    
    // Clean up preloaded images that are no longer needed
    preloadedImages.current.forEach((_, key) => {
      if (!currentlyNeededImages.has(key)) {
        preloadedImages.current.delete(key);
      }
    });
    
    // Reset the timer for the new image
    setStartTime(Date.now());
    
    return () => {
      if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentRouteIndex, routeData, mapSource]);

  // Add keyboard support
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
    
    // Calculate response time in milliseconds
    const responseTime = Date.now() - startTime;
    
    // Update performance in the user context
    updatePerformance(isCorrect, responseTime);
    
    // Set result message based on response time
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
    
    // Clear any existing timeouts
    if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    
    // Show result for a shorter time
    resultTimeout.current = window.setTimeout(() => {
      setShowResult(null);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentRouteIndex((currentRouteIndex + 1) % routeData.length);
        setIsTransitioning(false);
      }, 200);
    }, 400);
  };

  // If no routes are loaded yet, show a loading state
  if (routeData.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading routes...</div>;
  }
  
  // Get current route data
  const currentRoute = routeData[currentRouteIndex];
  
  // If current route is still undefined for some reason, show loading
  if (!currentRoute) {
    return <div className="flex justify-center items-center h-64">Loading route data...</div>;
  }
  
  const currentImageUrl = getImageUrl(mapSource, currentRoute.candidateIndex, false);
  
  // Map color strings to actual color values
  const getColorValue = (colorStr: string): string => {
    if (colorStr.toLowerCase() === 'red') return '#FF5733';
    if (colorStr.toLowerCase() === 'blue') return '#3357FF';
    return colorStr; // If it's already a hex color or other value, use as is
  };
  
  // Set button colors based on shortest side and color
  const leftButtonColor = currentRoute.shortestSide === 'left' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');
    
  const rightButtonColor = currentRoute.shortestSide === 'right' 
    ? getColorValue(currentRoute.shortestColor) 
    : getColorValue(currentRoute.shortestColor === 'red' ? 'blue' : 'red');

  return (
    <div className="relative w-full">
      {/* Main card with image and controls */}
      <div className="glass-card overflow-hidden">
        {/* Image container */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <img 
            src={currentImageUrl} 
            alt="Orienteering route" 
            className={`w-full h-full object-cover transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${!isTransitioning ? 'image-fade-in' : ''}`}
          />
          
          {/* Win/Lose overlay */}
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
          
          {/* Direction buttons */}
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

      {/* Optional: Display route information for debugging */}
      {currentRoute && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Route #{currentRoute.candidateIndex} - Length comparison: Main {currentRoute.mainRouteLength.toFixed(2)}m vs Alt {currentRoute.altRouteLength.toFixed(2)}m</p>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;
