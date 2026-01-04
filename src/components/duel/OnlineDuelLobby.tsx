import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useOnlineDuel, OnlineDuelRoom } from '@/hooks/useOnlineDuel';
import { useRouteCache } from '@/context/RouteCache';
import { DuelSettings } from './DuelSetup';
import { RouteData } from '@/utils/routeDataUtils';
import { Users, Copy, Check, Wifi, WifiOff, Loader2, ArrowLeft, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnlineDuelLobbyProps {
  settings: DuelSettings;
  onGameStart: (routes: RouteData[], room: OnlineDuelRoom) => void;
  onBack: () => void;
  playerName?: string;
  joinMode?: boolean;
}

const OnlineDuelLobby: React.FC<OnlineDuelLobbyProps> = ({ settings, onGameStart, onBack, playerName: initialPlayerName = '', joinMode = false }) => {
  const { toast } = useToast();
  const { getRoutesForMap } = useRouteCache();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(joinMode ? 'join' : 'choose');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedRoutes, setLoadedRoutes] = useState<RouteData[]>([]);
  const [displayName] = useState(initialPlayerName || 'Player');

  const {
    room,
    isHost,
    isConnecting,
    userId,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    leaveRoom,
  } = useOnlineDuel({
    onGameStart: () => {
      if (room?.routes) {
        onGameStart(room.routes as RouteData[], room);
      }
    },
  });

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
    await createRoom(settings, loadedRoutes, displayName);
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

  const handleStartGame = () => {
    if (room?.guest_id) {
      startGame();
    } else {
      toast({
        title: 'Waiting for opponent',
        description: 'Share the room code to invite someone',
      });
    }
  };

  const handleBack = () => {
    leaveRoom();
    onBack();
  };

  // Room created - waiting for opponent
  if (room && mode === 'create') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-500" />
              Room Created
            </CardTitle>
            <CardDescription>
              Share this code with your opponent
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
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">P1</div>
                  <span className="font-medium">{room.host_name || 'Host'}</span>
                </div>
                <Check className="h-4 w-4 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${room.guest_id ? 'bg-blue-500' : 'bg-muted-foreground'}`}>P2</div>
                  <span className="font-medium">
                    {room.guest_id ? (room.guest_name || 'Opponent') : 'Waiting...'}
                  </span>
                </div>
                {room.guest_id ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
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
                disabled={!room.guest_id}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Joined a room - waiting for host to start
  if (room && mode !== 'create') {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-500" />
              Room Joined
            </CardTitle>
            <CardDescription>
              Waiting for host to start the game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="text-2xl font-mono font-bold text-primary mb-2">
                Room: {room.room_code}
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for host...</span>
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
