import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouteCache } from '../context/RouteCache';
import { RouteData } from '../utils/routeDataUtils';
import DuelIntro from '../components/duel/DuelIntro';
import DuelSetup, { DuelSettings } from '../components/duel/DuelSetup';
import DuelGame from '../components/duel/DuelGame';

type DuelPhase = 'intro' | 'setup' | 'playing';

const DuelMode: React.FC = () => {
  const navigate = useNavigate();
  const { getRoutesForMap, isPreloading } = useRouteCache();
  const [phase, setPhase] = useState<DuelPhase>('intro');
  const [gameRoutes, setGameRoutes] = useState<RouteData[]>([]);
  const [settings, setSettings] = useState<DuelSettings>({
    mapId: 'all',
    gameType: 'routes',
    routeCount: 10,
    gameMode: 'speed',
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSetupComplete = async (newSettings: DuelSettings) => {
    setIsLoading(true);
    setSettings(newSettings);
    
    try {
      const { routes } = await getRoutesForMap(newSettings.mapId, true);
      const shuffled = [...routes].sort(() => Math.random() - 0.5);
      const selectedRoutes = shuffled.slice(0, newSettings.routeCount);
      
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
    setIsLoading(true);
    
    try {
      const { routes } = await getRoutesForMap(settings.mapId, true);
      const shuffled = [...routes].sort(() => Math.random() - 0.5);
      const selectedRoutes = shuffled.slice(0, settings.routeCount);
      
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
          totalRoutes={settings.routeCount}
          settings={settings}
          onExit={handleBackToSetup}
          onRestart={handleRestart}
        />
      )}
    </>
  );
};

export default DuelMode;
