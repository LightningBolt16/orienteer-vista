import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RouteData } from '@/utils/routeDataUtils';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineDuelRoom {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  settings: any;
  routes: RouteData[] | null;
  current_route_index: number;
  host_score: number;
  guest_score: number;
  host_ready: boolean;
  guest_ready: boolean;
  game_started_at: string | null;
  game_ends_at: string | null;
  host_name: string | null;
  guest_name: string | null;
}

interface UseOnlineDuelProps {
  onGameStart?: (room: OnlineDuelRoom) => void;
  onOpponentAnswer?: (routeIndex: number, answer: 'left' | 'right') => void;
  onGameEnd?: () => void;
}

export const useOnlineDuel = ({ onGameStart, onOpponentAnswer, onGameEnd }: UseOnlineDuelProps = {}) => {
  const { toast } = useToast();
  const [room, setRoom] = useState<OnlineDuelRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

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
  const createRoom = useCallback(async (settings: any, routes: RouteData[], hostName?: string) => {
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
        })
        .select()
        .single();

      if (error) throw error;

      setRoom(data as unknown as OnlineDuelRoom);
      setIsHost(true);
      
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
      // Find the room
      const { data: roomData, error: findError } = await supabase
        .from('duel_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .is('guest_id', null)
        .single();

      if (findError || !roomData) {
        toast({
          title: 'Room not found',
          description: 'Check the code and try again',
          variant: 'destructive',
        });
        return null;
      }

      // Join the room
      const { data, error } = await supabase
        .from('duel_rooms')
        .update({ guest_id: playerId, guest_name: guestName || null })
        .eq('id', roomData.id)
        .select()
        .single();

      if (error) throw error;

      setRoom(data as unknown as OnlineDuelRoom);
      setIsHost(false);
      
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

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomId: string) => {
    console.log('[OnlineDuel] Subscribing to room:', roomId);
    
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
            const oldRoom = payload.old as any;
            
            setRoom(newRoom);
            
            // Only trigger for guest (host triggers manually in startGame)
            if (newRoom.status === 'playing' && oldRoom?.status === 'waiting') {
              console.log('[OnlineDuel] Game started - transitioning to playing');
              onGameStart?.(newRoom);
            }
            
            if (newRoom.status === 'finished' && oldRoom?.status === 'playing') {
              console.log('[OnlineDuel] Game ended');
              onGameEnd?.();
            }
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
            if (answer.player_id !== playerId) {
              onOpponentAnswer?.(answer.route_index, answer.answer);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[OnlineDuel] Subscription status:', status);
      });

    setChannel(newChannel);
  }, [playerId, onGameStart, onOpponentAnswer, onGameEnd]);

  // Set ready status
  const setReady = useCallback(async (ready: boolean) => {
    if (!room) return;

    const updateField = isHost ? { host_ready: ready } : { guest_ready: ready };
    
    const { error } = await supabase
      .from('duel_rooms')
      .update(updateField)
      .eq('id', room.id);

    if (error) {
      console.error('Error setting ready:', error);
    }
  }, [room, isHost]);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    console.log('[OnlineDuel] startGame called', { roomId: room?.id, isHost, hasGuest: !!room?.guest_id });
    
    if (!room || !isHost) {
      console.log('[OnlineDuel] Cannot start - not host or no room');
      return;
    }

    if (!room.guest_id) {
      console.log('[OnlineDuel] Cannot start - no guest joined');
      toast({
        title: 'Waiting for opponent',
        description: 'Share the room code to invite someone',
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
  }, [room, isHost, toast, onGameStart]);

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
    const scoreField = isHost ? 'host_score' : 'guest_score';
    const scoreChange = isCorrect ? 1 : -0.5;
    
    await supabase
      .from('duel_rooms')
      .update({ 
        [scoreField]: (isHost ? room.host_score : room.guest_score) + scoreChange 
      })
      .eq('id', room.id);
  }, [room, playerId, isHost]);

  // Leave/delete room
  const leaveRoom = useCallback(async () => {
    if (!room) return;

    if (channel) {
      await supabase.removeChannel(channel);
    }

    if (isHost) {
      await supabase.from('duel_rooms').delete().eq('id', room.id);
    } else {
      await supabase
        .from('duel_rooms')
        .update({ guest_id: null, guest_ready: false })
        .eq('id', room.id);
    }

    setRoom(null);
    setChannel(null);
  }, [room, channel, isHost]);

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
    isConnecting,
    playerId,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    submitAnswer,
    leaveRoom,
    finishGame,
    subscribeToRoom,
  };
};
