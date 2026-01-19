import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RouteData } from '@/utils/routeDataUtils';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineDuelRoom {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  player_3_id: string | null;
  player_4_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  settings: any;
  routes: RouteData[] | null;
  current_route_index: number;
  host_score: number;
  guest_score: number;
  player_3_score: number;
  player_4_score: number;
  host_ready: boolean;
  guest_ready: boolean;
  player_3_ready: boolean;
  player_4_ready: boolean;
  game_started_at: string | null;
  game_ends_at: string | null;
  host_name: string | null;
  guest_name: string | null;
  player_3_name: string | null;
  player_4_name: string | null;
  max_players: number;
  current_player_count: number;
}

interface UseOnlineDuelProps {
  onGameStart?: (room: OnlineDuelRoom) => void;
  onOpponentAnswer?: (routeIndex: number, answer: 'left' | 'right') => void;
  onGameEnd?: () => void;
}

export type PlayerSlot = 'host' | 'guest' | 'player_3' | 'player_4';

export const useOnlineDuel = ({ onGameStart, onOpponentAnswer, onGameEnd }: UseOnlineDuelProps = {}) => {
  const { toast } = useToast();
  const [room, setRoom] = useState<OnlineDuelRoom | null>(null);
  const [playerSlot, setPlayerSlot] = useState<PlayerSlot | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isHost = playerSlot === 'host';

  // Get or create persistent player ID (supports guests via sessionStorage)
  useEffect(() => {
    const initPlayerId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        setPlayerId(user.id);
        // Clear guest ID if user logs in
        sessionStorage.removeItem('duel-guest-id');
      } else {
        // Use existing guest ID or create new one
        let guestId = sessionStorage.getItem('duel-guest-id');
        if (!guestId) {
          guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('duel-guest-id', guestId);
        }
        setPlayerId(guestId);
      }
    };
    
    initPlayerId();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user?.id) {
          setPlayerId(session.user.id);
          sessionStorage.removeItem('duel-guest-id');
        } else {
          let guestId = sessionStorage.getItem('duel-guest-id');
          if (!guestId) {
            guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('duel-guest-id', guestId);
          }
          setPlayerId(guestId);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Generate unique room code
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Create a new room
  const createRoom = useCallback(async (settings: any, routes: RouteData[], hostName?: string, maxPlayers: number = 2) => {
    if (!playerId) {
      toast({ title: 'Not ready', description: 'Please wait...', variant: 'destructive' });
      return null;
    }

    setIsConnecting(true);
    try {
      const roomCode = generateRoomCode();
      
      const { data, error } = await supabase
        .from('duel_rooms')
        .insert({
          room_code: roomCode,
          host_id: playerId,
          host_name: hostName || null,
          settings,
          routes: routes as any,
          status: 'waiting',
          max_players: maxPlayers,
          current_player_count: 1,
        })
        .select()
        .single();

      if (error) throw error;

      setRoom(data as unknown as OnlineDuelRoom);
      setPlayerSlot('host');
      
      // Subscribe to room updates
      subscribeToRoom(data.id);
      
      toast({
        title: 'Room created!',
        description: `Share code: ${roomCode}`,
      });

      return data as unknown as OnlineDuelRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Failed to create room',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [playerId, toast]);

  // Join an existing room
  const joinRoom = useCallback(async (roomCode: string, guestName?: string) => {
    if (!playerId) {
      toast({ title: 'Not ready', description: 'Please wait...', variant: 'destructive' });
      return null;
    }

    setIsConnecting(true);
    try {
      // Find the room with available slots
      const { data: roomData, error: findError } = await supabase
        .from('duel_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (findError || !roomData) {
        toast({
          title: 'Room not found',
          description: 'Check the code and try again',
          variant: 'destructive',
        });
        return null;
      }

      // Check if room is full
      if (roomData.current_player_count >= roomData.max_players) {
        toast({
          title: 'Room is full',
          description: 'This room already has the maximum number of players',
          variant: 'destructive',
        });
        return null;
      }

      // Determine which slot to fill
      let updateData: any = {};
      let slot: PlayerSlot;
      
      if (!roomData.guest_id) {
        slot = 'guest';
        updateData = { 
          guest_id: playerId, 
          guest_name: guestName || null,
          current_player_count: roomData.current_player_count + 1
        };
      } else if (!roomData.player_3_id && roomData.max_players >= 3) {
        slot = 'player_3';
        updateData = { 
          player_3_id: playerId, 
          player_3_name: guestName || null,
          current_player_count: roomData.current_player_count + 1
        };
      } else if (!roomData.player_4_id && roomData.max_players >= 4) {
        slot = 'player_4';
        updateData = { 
          player_4_id: playerId, 
          player_4_name: guestName || null,
          current_player_count: roomData.current_player_count + 1
        };
      } else {
        toast({
          title: 'Room is full',
          description: 'No available slots in this room',
          variant: 'destructive',
        });
        return null;
      }

      // Join the room
      const { data, error } = await supabase
        .from('duel_rooms')
        .update(updateData)
        .eq('id', roomData.id)
        .select()
        .single();

      if (error) throw error;

      setRoom(data as unknown as OnlineDuelRoom);
      setPlayerSlot(slot);
      
      // Subscribe to room updates
      subscribeToRoom(data.id);
      
      toast({
        title: 'Joined room!',
        description: 'Waiting for host to start',
      });

      return data as unknown as OnlineDuelRoom;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Failed to join room',
        description: 'Please try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [playerId, toast]);

  // Store callbacks in refs to avoid stale closure issues
  const onGameStartRef = React.useRef(onGameStart);
  const onOpponentAnswerRef = React.useRef(onOpponentAnswer);
  const onGameEndRef = React.useRef(onGameEnd);
  const playerIdRef = React.useRef(playerId);
  
  // Track previous room status to detect transitions reliably (payload.old can be incomplete)
  const previousStatusRef = React.useRef<string | null>(null);

  // Keep refs up to date
  useEffect(() => {
    onGameStartRef.current = onGameStart;
    onOpponentAnswerRef.current = onOpponentAnswer;
    onGameEndRef.current = onGameEnd;
    playerIdRef.current = playerId;
  }, [onGameStart, onOpponentAnswer, onGameEnd, playerId]);

  // Refetch room state - used as fallback when subscription might have missed updates
  const refetchRoom = useCallback(async (roomId: string) => {
    console.log('[OnlineDuel] Refetching room state:', roomId);
    const { data, error } = await supabase
      .from('duel_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error) {
      console.error('[OnlineDuel] Error refetching room:', error);
      return;
    }
    
    if (data) {
      const fetchedRoom = data as unknown as OnlineDuelRoom;
      console.log('[OnlineDuel] Refetched room status:', fetchedRoom.status, 'previous:', previousStatusRef.current);
      setRoom(fetchedRoom);
      
      // If room is already playing and we haven't triggered yet, trigger game start
      if (fetchedRoom.status === 'playing' && previousStatusRef.current !== 'playing') {
        console.log('[OnlineDuel] Room already playing - triggering game start');
        previousStatusRef.current = 'playing';
        onGameStartRef.current?.(fetchedRoom);
      }
      
      // Update previous status ref
      previousStatusRef.current = fetchedRoom.status;
    }
  }, []);

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomId: string) => {
    console.log('[OnlineDuel] Subscribing to room:', roomId);
    setIsSubscribed(false);
    
    const newChannel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duel_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log('[OnlineDuel] Room update received:', payload.eventType, payload.new);
          if (payload.new) {
            const newRoom = payload.new as unknown as OnlineDuelRoom;
            
            setRoom(newRoom);
            
            // Trigger game start when status changes to playing
            // Use ref to track previous status instead of relying on payload.old (which can be incomplete)
            if (newRoom.status === 'playing' && previousStatusRef.current !== 'playing') {
              console.log('[OnlineDuel] Game started - transitioning to playing (previous:', previousStatusRef.current, ')');
              previousStatusRef.current = 'playing';
              onGameStartRef.current?.(newRoom);
            }
            
            if (newRoom.status === 'finished' && previousStatusRef.current === 'playing') {
              console.log('[OnlineDuel] Game ended');
              previousStatusRef.current = 'finished';
              onGameEndRef.current?.();
            }
            
            // Always update the previous status ref
            previousStatusRef.current = newRoom.status;
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_answers',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('[OnlineDuel] Answer received:', payload);
          if (payload.new) {
            const answer = payload.new as any;
            // Only notify about opponent's answers
            if (answer.player_id !== playerIdRef.current) {
              onOpponentAnswerRef.current?.(answer.route_index, answer.answer);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[OnlineDuel] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          // Immediately refetch room state in case we missed the status change
          refetchRoom(roomId);
        }
      });

    setChannel(newChannel);
  }, [refetchRoom]);

  // Set ready status
  const setReady = useCallback(async (ready: boolean) => {
    if (!room || !playerSlot) return;

    const readyField = `${playerSlot === 'host' ? 'host' : playerSlot}_ready`;
    
    const { error } = await supabase
      .from('duel_rooms')
      .update({ [readyField]: ready })
      .eq('id', room.id);

    if (error) {
      console.error('Error setting ready:', error);
    }
  }, [room, playerSlot]);

  // Check if minimum players are present for game start
  const canStartGame = useCallback((currentRoom: OnlineDuelRoom | null) => {
    if (!currentRoom) return false;
    // Need at least 2 players
    return currentRoom.current_player_count >= 2;
  }, []);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    console.log('[OnlineDuel] startGame called', { roomId: room?.id, isHost, playerCount: room?.current_player_count });
    
    if (!room || !isHost) {
      console.log('[OnlineDuel] Cannot start - not host or no room');
      return;
    }

    if (!canStartGame(room)) {
      console.log('[OnlineDuel] Cannot start - not enough players');
      toast({
        title: 'Waiting for players',
        description: 'Need at least 2 players to start',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('duel_rooms')
        .update({ 
          status: 'playing',
          game_started_at: new Date().toISOString(),
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) {
        console.error('[OnlineDuel] Error starting game:', error);
        toast({
          title: 'Failed to start game',
          variant: 'destructive',
        });
        return;
      }

      console.log('[OnlineDuel] Game started successfully', data);
      
      // Update local room state immediately for host
      const updatedRoom = data as unknown as OnlineDuelRoom;
      setRoom(updatedRoom);
      
      // Manually trigger onGameStart for host (don't wait for realtime)
      onGameStart?.(updatedRoom);
      
    } catch (err) {
      console.error('[OnlineDuel] Exception starting game:', err);
      toast({
        title: 'Failed to start game',
        variant: 'destructive',
      });
    }
  }, [room, isHost, toast, onGameStart, canStartGame]);

  // Get score field name for current player
  const getScoreField = useCallback(() => {
    switch (playerSlot) {
      case 'host': return 'host_score';
      case 'guest': return 'guest_score';
      case 'player_3': return 'player_3_score';
      case 'player_4': return 'player_4_score';
      default: return 'host_score';
    }
  }, [playerSlot]);

  // Get current player's score
  const getMyScore = useCallback(() => {
    if (!room || !playerSlot) return 0;
    switch (playerSlot) {
      case 'host': return room.host_score;
      case 'guest': return room.guest_score;
      case 'player_3': return room.player_3_score;
      case 'player_4': return room.player_4_score;
      default: return 0;
    }
  }, [room, playerSlot]);

  // Submit an answer
  const submitAnswer = useCallback(async (routeIndex: number, answer: 'left' | 'right', answerTimeMs: number, isCorrect: boolean) => {
    if (!room || !playerId) return;

    const { error } = await supabase
      .from('duel_answers')
      .insert({
        room_id: room.id,
        player_id: playerId,
        route_index: routeIndex,
        answer,
        answer_time_ms: answerTimeMs,
        is_correct: isCorrect,
      });

    if (error) {
      console.error('Error submitting answer:', error);
    }

    // Update score
    const scoreField = getScoreField();
    const currentScore = getMyScore();
    const scoreChange = isCorrect ? 1 : -0.5;
    
    await supabase
      .from('duel_rooms')
      .update({ 
        [scoreField]: currentScore + scoreChange 
      })
      .eq('id', room.id);
  }, [room, playerId, getScoreField, getMyScore]);

  // Leave/delete room
  const leaveRoom = useCallback(async () => {
    if (!room) return;

    if (channel) {
      await supabase.removeChannel(channel);
    }

    if (isHost) {
      await supabase.from('duel_rooms').delete().eq('id', room.id);
    } else if (playerSlot) {
      // Clear the player's slot
      const clearFields: any = { current_player_count: Math.max(1, room.current_player_count - 1) };
      switch (playerSlot) {
        case 'guest':
          clearFields.guest_id = null;
          clearFields.guest_name = null;
          clearFields.guest_ready = false;
          break;
        case 'player_3':
          clearFields.player_3_id = null;
          clearFields.player_3_name = null;
          clearFields.player_3_ready = false;
          break;
        case 'player_4':
          clearFields.player_4_id = null;
          clearFields.player_4_name = null;
          clearFields.player_4_ready = false;
          break;
      }
      
      await supabase
        .from('duel_rooms')
        .update(clearFields)
        .eq('id', room.id);
    }

    setRoom(null);
    setChannel(null);
    setPlayerSlot(null);
  }, [room, channel, isHost, playerSlot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  // Finish the game
  const finishGame = useCallback(async () => {
    if (!room) return;

    await supabase
      .from('duel_rooms')
      .update({ status: 'finished' })
      .eq('id', room.id);
  }, [room]);

  return {
    room,
    isHost,
    playerSlot,
    isConnecting,
    isSubscribed,
    playerId,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    submitAnswer,
    leaveRoom,
    finishGame,
    subscribeToRoom,
    refetchRoom,
    canStartGame,
    getMyScore,
  };
};
