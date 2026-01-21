import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouteCache } from '../context/RouteCache';
import { RouteData } from '../utils/routeDataUtils';
import DuelIntro from '../components/duel/DuelIntro';
import DuelSetup, { DuelSettings } from '../components/duel/DuelSetup';
import DuelGame from '../components/duel/DuelGame';
import OnlineDuelLobby from '../components/duel/OnlineDuelLobby';
import { useOnlineDuel, OnlineDuelRoom } from '../hooks/useOnlineDuel';

type DuelPhase = 'intro' | 'setup' | 'playing' | 'online-lobby' | 'online-join';

const DuelMode: React.FC = () => {
  const navigate = useNavigate();
  const { getRoutesForMap, getUserRoutes, getCommunityRoutes, isPreloading } = useRouteCache();
  const [phase, setPhase] = useState<DuelPhase>('intro');
  const [gameRoutes, setGameRoutes] = useState<RouteData[]>([]);
  const [settings, setSettings] = useState<DuelSettings>({
    mapId: 'all',
    gameType: 'routes',
    routeCount: 10,
    gameMode: 'speed',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [playerName, setPlayerName] = useState<string>('');

  const onlineDuel = useOnlineDuel({
    onGameStart: (room) => {
      if (room?.routes) {
        setGameRoutes(room.routes as RouteData[]);
        setPhase('playing');
      }
    },
    onGameEnd: () => {},
  });

  useEffect(() => {
    if (phase === 'setup') {
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

  // Load routes based on settings (handles multi-select and categories)
  const loadRoutesForSettings = async (newSettings: DuelSettings): Promise<RouteData[]> => {
    const isMobile = window.innerWidth <= 768;
    let allRoutes: RouteData[] = [];

    // Multi-select mode
    if (newSettings.mapIds && newSettings.mapIds.length > 0) {
      for (const mapName of newSettings.mapIds) {
        let result;
        if (newSettings.mapCategory === 'private') {
          result = await getUserRoutes(isMobile);
          result.routes = result.routes.filter(r => r.mapName?.toLowerCase() === mapName.toLowerCase());
        } else if (newSettings.mapCategory === 'community') {
          result = await getCommunityRoutes(mapName, isMobile);
        } else {
          result = await getRoutesForMap(mapName, isMobile);
        }
        allRoutes.push(...result.routes);
      }
    } else {
      // Single map selection
      if (newSettings.mapCategory === 'private') {
        const result = await getUserRoutes(isMobile);
        allRoutes = newSettings.mapId === 'all' 
          ? result.routes 
          : result.routes.filter(r => r.mapName?.toLowerCase() === newSettings.mapId.toLowerCase());
      } else if (newSettings.mapCategory === 'community') {
        const result = await getCommunityRoutes(newSettings.mapId, isMobile);
        allRoutes = result.routes;
      } else {
        const result = await getRoutesForMap(newSettings.mapId, isMobile);
        allRoutes = result.routes;
      }
    }

    return allRoutes;
  };

  const handleSetupComplete = async (newSettings: DuelSettings) => {
    setIsLoading(true);
    setSettings(newSettings);
    
    try {
      const routes = await loadRoutesForSettings(newSettings);
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
    if (newSettings.playerName) {
      setPlayerName(newSettings.playerName);
    }
    setPhase('online-lobby');
  };

  const handleJoinRoom = (name: string) => {
    setPlayerName(name);
    // CRITICAL: Set isOnline to true for guests joining online rooms
    setSettings(prev => ({
      ...prev,
      isOnline: true
    }));
    setPhase('online-join');
  };

  const handleOnlineGameStart = useCallback((routes: RouteData[], room: OnlineDuelRoom) => {
    setGameRoutes(routes);
    // Ensure isOnline is set when transitioning to playing
    setSettings(prev => ({
      ...prev,
      isOnline: true
    }));
    setPhase('playing');
  }, []);

  const handleExit = () => {
    navigate('/');
  };

  const handleRestart = async () => {
    setIsLoading(true);
    
    try {
      const routes = await loadRoutesForSettings(settings);
      const shuffled = [...routes].sort(() => Math.random() - 0.5);
      const selectedRoutes = shuffled.slice(0, settings.routeCount);
      
      setGameRoutes(selectedRoutes);
    } catch (error) {
      console.error('Failed to reload routes:', error);
    }
    
    setIsLoading(false);
  };

  const handleBackToSetup = async () => {
    await onlineDuel.leaveRoom();
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
          onJoinRoom={handleJoinRoom}
          onBack={handleExit}
        />
      )}

      {phase === 'online-join' && (
        <OnlineDuelLobby
          settings={settings}
          onGameStart={handleOnlineGameStart}
          onBack={handleBackToSetup}
          playerName={playerName}
          joinMode={true}
          onlineDuel={onlineDuel}
        />
      )}

      {phase === 'online-lobby' && (
        <OnlineDuelLobby
          settings={settings}
          onGameStart={handleOnlineGameStart}
          onBack={handleBackToSetup}
          playerName={playerName}
          joinMode={false}
          onlineDuel={onlineDuel}
        />
      )}
      
      {phase === 'playing' && gameRoutes.length > 0 && (
        <DuelGame 
          routes={gameRoutes}
          totalRoutes={settings.routeCount}
          settings={settings}
          onExit={handleBackToSetup}
          onRestart={handleRestart}
          onlineDuel={settings.isOnline ? onlineDuel : undefined}
        />
      )}
    </>
  );
};

export default DuelMode;
