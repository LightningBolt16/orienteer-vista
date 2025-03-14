
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';

// Sample images - in real implementation, these would be fetched from your folder
const routeImages = [
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?auto=format&fit=crop&w=1200&q=80"
];

const RouteSelector: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResult, setShowResult] = useState<'win' | 'lose' | null>(null);
  const [correctDirection, setCorrectDirection] = useState<'left' | 'right'>('left');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const { addPoints } = useUser();
  const { t } = useLanguage();
  const resultTimeout = useRef<number | null>(null);
  const transitionTimeout = useRef<number | null>(null);

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
    
    // Calculate points based on milliseconds spent (faster = more points)
    const timeSpent = Date.now() - startTime; // in milliseconds
    let pointsEarned = 0;
    
    if (isCorrect) {
      // Base points are 20, decreasing by 1 for every 100ms, with a minimum of 10
      pointsEarned = Math.max(10, Math.round(30 - (timeSpent / 100)));
      addPoints(pointsEarned);
      setEarnedPoints(pointsEarned);
    } else {
      // Lose points on incorrect choice (up to -10 points)
      pointsEarned = -10;
      addPoints(pointsEarned);
      setEarnedPoints(pointsEarned);
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
                    +{earnedPoints} poäng
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="text-red-500 w-32 h-32 animate-[lose-animation_0.4s_ease-out]" />
                  <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-bold animate-fade-in">
                    {earnedPoints} poäng
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
