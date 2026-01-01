import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouteCache } from '../context/RouteCache';
import { RouteData } from '../utils/routeDataUtils';
import DuelIntro from '../components/duel/DuelIntro';
import DuelSetup from '../components/duel/DuelSetup';
import DuelGame from '../components/duel/DuelGame';

type DuelPhase = 'intro' | 'setup' | 'playing';

const DuelMode: React.FC = () => {
  const navigate = useNavigate();
  const { getRoutesForMap, isPreloading } = useRouteCache();
  const [phase, setPhase] = useState<DuelPhase>('intro');
  const [gameRoutes, setGameRoutes] = useState<RouteData[]>([]);
  const [totalRoutes, setTotalRoutes] = useState(10);
  const [selectedMapId, setSelectedMapId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has seen the intro before (using localStorage for simplicity)
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('duel-intro-seen');
    if (hasSeenIntro === 'true') {
      setPhase('setup');
    }
  }, []);

  const handleIntroComplete = () => {
    localStorage.setItem('duel-intro-seen', 'true');
    setPhase('setup');
  };

  const handleSetupComplete = async (mapId: string, routeCount: number) => {
    setIsLoading(true);
    setSelectedMapId(mapId);
    setTotalRoutes(routeCount);
    
    try {
      const { routes } = await getRoutesForMap(mapId, false);
      
      // Shuffle and limit routes
      const shuffled = [...routes].sort(() => Math.random() - 0.5);
      const selectedRoutes = shuffled.slice(0, routeCount);
      
      setGameRoutes(selectedRoutes);
      setPhase('playing');
    } catch (error) {
      console.error('Failed to load routes for duel:', error);
    }
    
    setIsLoading(false);
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleRestart = async () => {
    // Reload routes with same settings
    setIsLoading(true);
    
    try {
      const { routes } = await getRoutesForMap(selectedMapId, false);
      const shuffled = [...routes].sort(() => Math.random() - 0.5);
      const selectedRoutes = shuffled.slice(0, totalRoutes);
      
      setGameRoutes(selectedRoutes);
    } catch (error) {
      console.error('Failed to reload routes:', error);
    }
    
    setIsLoading(false);
  };

  const handleBackToSetup = () => {
    setPhase('setup');
  };

  if (isLoading || isPreloading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {phase === 'intro' && (
        <DuelIntro onStart={handleIntroComplete} />
      )}
      
      {phase === 'setup' && (
        <DuelSetup 
          onStart={handleSetupComplete}
          onBack={handleExit}
        />
      )}
      
      {phase === 'playing' && gameRoutes.length > 0 && (
        <DuelGame 
          routes={gameRoutes}
          totalRoutes={totalRoutes}
          onExit={handleBackToSetup}
          onRestart={handleRestart}
        />
      )}
    </>
  );
};

export default DuelMode;
