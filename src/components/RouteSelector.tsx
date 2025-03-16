
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';

// Images will be stored in the /public/routes/ folder
// This approach allows you to easily add/remove images by modifying this folder
const routeImages = [
  "/routes/route1.png",
  "/routes/route2.png",
  "/routes/route3.png",
  "/routes/route4.png",
  "/routes/route5.png",
  "/routes/route6.png",
  "/routes/route7.png"
];

const RouteSelector: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [correctDirection, setCorrectDirection] = useState<'left' | 'right'>('left');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [resultMessage, setResultMessage] = useState<string>('');
  const { updatePerformance } = useUser();
  const { t } = useLanguage();
  const resultTimeout = useRef<number | null>(null);
  const transitionTimeout = useRef<number | null>(null);

  // Add keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning) return;
      
      if (e.key === 'ArrowLeft') {
        handleDirectionSelect('left');
      } else if (e.key === 'ArrowRight') {
        handleDirectionSelect('right');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [correctDirection, isTransitioning]);

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentImageIndex + 1) % routeImages.length;
    const img = new Image();
    img.src = routeImages[nextIndex];
    setNextImage(routeImages[nextIndex]);
    
    // Randomly set the correct direction
    setCorrectDirection(Math.random() > 0.5 ? 'left' : 'right');
    
    // Reset the timer for the new image
    setStartTime(Date.now());
    
    return () => {
      if (resultTimeout.current) window.clearTimeout(resultTimeout.current);
      if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
    };
  }, [currentImageIndex]);

  const handleDirectionSelect = (direction: 'left' | 'right') => {
    if (isTransitioning) return;
    
    const isCorrect = direction === correctDirection;
    
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
    
    // Show result for a shorter time (400ms instead of 800ms)
    resultTimeout.current = window.setTimeout(() => {
      setShowResult(null);
      transitionTimeout.current = window.setTimeout(() => {
        setCurrentImageIndex((currentImageIndex + 1) % routeImages.length);
        setIsTransitioning(false);
      }, 200); // Faster transition (200ms instead of 300ms)
    }, 400); // Faster result display
  };

  return (
    <div className="relative w-full">
      {/* Main card with image and controls */}
      <div className="glass-card overflow-hidden">
        {/* Image container */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <img 
            src={routeImages[currentImageIndex]} 
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
              className="bg-white/80 hover:bg-white text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              disabled={isTransitioning}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            
            <button 
              onClick={() => handleDirectionSelect('right')} 
              className="bg-white/80 hover:bg-white text-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              disabled={isTransitioning}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelector;
