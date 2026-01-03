import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouteCache } from '../context/RouteCache';
import { RouteData } from '../utils/routeDataUtils';
import DuelIntro from '../components/duel/DuelIntro';
import DuelSetup, { DuelSettings } from '../components/duel/DuelSetup';
import DuelGame from '../components/duel/DuelGame';
import OnlineDuelLobby from '../components/duel/OnlineDuelLobby';
import { OnlineDuelRoom } from '../hooks/useOnlineDuel';

type DuelPhase = 'intro' | 'setup' | 'playing' | 'online-lobby';

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
  const [onlineRoom, setOnlineRoom] = useState<OnlineDuelRoom | null>(null);

  // Preload routes when entering setup phase for faster game start
  useEffect(() => {
    if (phase === 'setup') {
      // Preload default routes in background
      getRoutesForMap('all', true).catch(console.error);
    }
  }, [phase, getRoutesForMap]);

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

  const handleStartOnline = (newSettings: DuelSettings) => {
    setSettings(newSettings);
    setPhase('online-lobby');
  };

  const handleOnlineGameStart = useCallback((routes: RouteData[], room: OnlineDuelRoom) => {
    setGameRoutes(routes);
    setOnlineRoom(room);
    setPhase('playing');
  }, []);

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
    setOnlineRoom(null);
    setPhase('setup');
  };

  if (isLoading || isPreloading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading routes...</p>
        </div>
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
          onStartOnline={handleStartOnline}
          onBack={handleExit}
        />
      )}

      {phase === 'online-lobby' && (
        <OnlineDuelLobby
          settings={settings}
          onGameStart={handleOnlineGameStart}
          onBack={handleBackToSetup}
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
