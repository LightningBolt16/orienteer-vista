import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { OnlineDuelRoom, PlayerSlot } from '@/hooks/useOnlineDuel';
import { useRouteCache } from '@/context/RouteCache';
import { DuelSettings } from './DuelSetup';
import { RouteData } from '@/utils/routeDataUtils';
import { Users, Copy, Check, Wifi, WifiOff, Loader2, ArrowLeft, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OnlineDuelHook {
  room: OnlineDuelRoom | null;
  isHost: boolean;
  playerSlot: PlayerSlot | null;
  isConnecting: boolean;
  playerId: string | null;
  createRoom: (settings: any, routes: RouteData[], hostName?: string, maxPlayers?: number) => Promise<OnlineDuelRoom | null>;
  joinRoom: (roomCode: string, guestName?: string) => Promise<OnlineDuelRoom | null>;
  startGame: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  canStartGame: (room: OnlineDuelRoom | null) => boolean;
}

interface OnlineDuelLobbyProps {
  settings: DuelSettings;
  onGameStart: (routes: RouteData[], room: OnlineDuelRoom) => void;
  onBack: () => void;
  playerName?: string;
  joinMode?: boolean;
  onlineDuel: OnlineDuelHook;
}

const PLAYER_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

const OnlineDuelLobby: React.FC<OnlineDuelLobbyProps> = ({ 
  settings, 
  onGameStart, 
  onBack, 
  playerName: initialPlayerName = '', 
  joinMode = false,
  onlineDuel 
}) => {
  const { toast } = useToast();
  const { getRoutesForMap } = useRouteCache();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(joinMode ? 'join' : 'choose');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedRoutes, setLoadedRoutes] = useState<RouteData[]>([]);
  const [displayName] = useState(initialPlayerName || 'Player');
  const [isStarting, setIsStarting] = useState(false);
  
  // Ref to prevent double-triggering game start
  const gameStartedRef = React.useRef(false);

  const { room, isHost, isConnecting, createRoom, joinRoom, startGame, leaveRoom, canStartGame } = onlineDuel;

  // Reset gameStartedRef when room changes
  useEffect(() => {
    if (!room) {
      gameStartedRef.current = false;
    }
  }, [room?.id]);

  // Polling fallback for guest - in case realtime subscription misses the status change
  useEffect(() => {
    // Only poll when: not host, room joined, game not yet started
    if (!room?.id || isHost || gameStartedRef.current) return;
    
    console.log('[OnlineDuelLobby] Starting guest polling fallback for room:', room.id);
    
    const pollInterval = setInterval(async () => {
      if (gameStartedRef.current) {
        clearInterval(pollInterval);
        return;
      }
      
      console.log('[OnlineDuelLobby] Polling room status...');
      const { data, error } = await supabase
        .from('duel_rooms')
        .select('*')
        .eq('id', room.id)
        .single();
      
      if (error) {
        console.error('[OnlineDuelLobby] Polling error:', error);
        return;
      }
      
      if (data?.status === 'playing' && data.routes && !gameStartedRef.current) {
        console.log('[OnlineDuelLobby] Polling detected game started!');
        gameStartedRef.current = true;
        clearInterval(pollInterval);
        onGameStart(data.routes as unknown as RouteData[], data as unknown as OnlineDuelRoom);
      }
    }, 2000);
    
    return () => {
      console.log('[OnlineDuelLobby] Stopping guest polling');
      clearInterval(pollInterval);
    };
  }, [room?.id, isHost, onGameStart]);

  // Load routes when creating a room (not when joining)
  useEffect(() => {
    if (joinMode) return; // Don't load routes when joining - host provides them
    
    const loadRoutes = async () => {
      const { routes } = await getRoutesForMap(settings.mapId, true);
      const selectedRoutes = routes.slice(0, settings.routeCount || 10);
      setLoadedRoutes(selectedRoutes);
    };
    loadRoutes();
  }, [settings, getRoutesForMap, joinMode]);

  // Auto-create room when entering in create mode
  useEffect(() => {
    if (!joinMode && mode === 'choose' && loadedRoutes.length > 0) {
      handleCreateRoom();
    }
  }, [joinMode, mode, loadedRoutes]);

  const handleCreateRoom = async () => {
    if (loadedRoutes.length === 0) {
      toast({
        title: 'Loading routes...',
        description: 'Please wait',
      });
      return;
    }
    await createRoom(settings, loadedRoutes, displayName, settings.maxPlayers || 2);
    setMode('create');
  };

  const handleJoinRoom = async () => {
    if (joinCode.length < 4) {
      toast({
        title: 'Invalid code',
        description: 'Enter a valid room code',
        variant: 'destructive',
      });
      return;
    }
    await joinRoom(joinCode, displayName);
  };

  const handleCopyCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    if (!canStartGame(room) || isStarting) {
      if (!canStartGame(room)) {
        toast({
          title: 'Waiting for players',
          description: 'Need at least 2 players to start',
        });
      }
      return;
    }
    
    setIsStarting(true);
    console.log('[OnlineDuelLobby] Starting game...');
    await startGame();
    // Don't reset isStarting - game should transition
  };

  const handleBack = () => {
    leaveRoom();
    onBack();
  };

  // Helper to get player info for a slot
  const getPlayerInfo = (slot: number) => {
    if (!room) return { id: null, name: null };
    switch (slot) {
      case 0: return { id: room.host_id, name: room.host_name || 'Host' };
      case 1: return { id: room.guest_id, name: room.guest_name || 'Player 2' };
      case 2: return { id: room.player_3_id, name: room.player_3_name || 'Player 3' };
      case 3: return { id: room.player_4_id, name: room.player_4_name || 'Player 4' };
      default: return { id: null, name: null };
    }
  };

  // Room created - waiting for players
  if (room && mode === 'create') {
    const maxPlayers = room.max_players || 2;
    const playerSlots = Array.from({ length: maxPlayers }, (_, i) => i);

    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-500" />
              Room Created
            </CardTitle>
            <CardDescription>
              Share this code with your opponents ({room.current_player_count}/{maxPlayers} players)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room Code Display */}
            <div className="flex items-center justify-center gap-2">
              <div className="text-4xl font-mono font-bold tracking-[0.3em] text-primary bg-primary/10 px-6 py-4 rounded-xl">
                {room.room_code}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Players Status */}
            <div className="space-y-2">
              {playerSlots.map((slotIndex) => {
                const player = getPlayerInfo(slotIndex);
                const isJoined = !!player.id;
                
                return (
                  <div key={slotIndex} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${isJoined ? PLAYER_COLORS[slotIndex] : 'bg-muted-foreground'}`}>
                        {PLAYER_LABELS[slotIndex]}
                      </div>
                      <span className="font-medium">
                        {isJoined ? player.name : 'Waiting...'}
                      </span>
                      {slotIndex === 0 && <span className="text-xs text-muted-foreground">(Host)</span>}
                    </div>
                    {isJoined ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Leave
              </Button>
              <Button 
                onClick={handleStartGame} 
                className="flex-1"
                disabled={!canStartGame(room) || isStarting}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isStarting ? 'Starting...' : 'Start Game'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Joined a room - waiting for host to start
  if (room && mode !== 'create') {
    const maxPlayers = room.max_players || 2;
    const playerSlots = Array.from({ length: maxPlayers }, (_, i) => i);

    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-500" />
              Room Joined
            </CardTitle>
            <CardDescription>
              Waiting for host to start ({room.current_player_count}/{maxPlayers} players)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <div className="text-2xl font-mono font-bold text-primary mb-4">
                Room: {room.room_code}
              </div>
              
              {/* Players Status */}
              <div className="space-y-2 mb-4">
                {playerSlots.map((slotIndex) => {
                  const player = getPlayerInfo(slotIndex);
                  const isJoined = !!player.id;
                  
                  return (
                    <div key={slotIndex} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${isJoined ? PLAYER_COLORS[slotIndex] : 'bg-muted-foreground'}`}>
                          {PLAYER_LABELS[slotIndex]}
                        </div>
                        <span className="font-medium">
                          {isJoined ? player.name : 'Waiting...'}
                        </span>
                        {slotIndex === 0 && <span className="text-xs text-muted-foreground">(Host)</span>}
                      </div>
                      {isJoined ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for host to start...</span>
              </div>
            </div>

            <Button variant="outline" onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Leave Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Loading state while creating room
  if (mode === 'choose') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Creating Room...
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Setting up your duel room</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join room mode
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Join Room</CardTitle>
          <CardDescription>
            Enter the 6-character room code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            className="text-center text-2xl font-mono tracking-[0.3em] h-14"
            maxLength={6}
            autoFocus
          />
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleJoinRoom} 
              className="flex-1"
              disabled={isConnecting || joinCode.length < 4}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnlineDuelLobby;
