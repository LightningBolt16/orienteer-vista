
# Fix Plan: Leaderboard Updates, Online Duel Issues, and UX Improvements

## Issues Identified

### 1. Leaderboard Not Updating
**Root Cause**: Route attempts are being recorded to `route_attempts` table successfully (verified in database), but the `user_profiles` table is not being updated with the new accuracy/speed stats.

**Analysis**:
- Recent route attempts exist (2026-01-26), but user_profiles last updated on 2026-01-19
- The `updatePerformance` function in `UserContext.tsx` appears to be failing silently when updating `user_profiles`
- The update uses `supabaseManager.executeWithRetry`, but errors may not be surfacing properly

### 2. Online Duel Game End Synchronization
**Root Cause**: Multiple issues in the online duel flow:

**Problem A - Game Not Ending for All Players**:
- The `finishGame` function updates room status to 'finished'
- But guests may not receive this update if realtime subscription misses the event
- The `OnlineDuelGameView` doesn't have a rematch button (only Exit)

**Problem B - End Screen Score Display Issues**:
- The local `DuelGame.tsx` game over screen shows P1/P2 scores from local state
- For online mode, `OnlineDuelGameView.tsx` is used but shows scores from `room.host_score`, `room.guest_score` etc.
- The database shows scores are not always being updated correctly (some show 0)

**Problem C - Rematch Not Working**:
- `handleRestart` in `DuelMode.tsx` only reloads routes locally
- It does NOT update the database room status back to 'playing'
- It does NOT reset scores in the database
- Guests are still subscribed to the old finished game state

### 3. Pre-fill Username for Logged-in Users
**Missing Feature**: The `playerName` state in `DuelSetupWizard.tsx` is initialized to empty string `''` instead of using `user?.name`.

---

## Technical Solutions

### Fix 1: Leaderboard Update - Add Error Logging and Retry

**File**: `src/context/UserContext.tsx`

**Changes**:
1. Add better error logging when `user_profiles` update fails
2. Ensure the update query is correctly targeting the user
3. Add a fallback polling mechanism to verify updates

```typescript
// Around lines 363-387, improve error handling:
await supabaseManager.executeWithRetry(
  async () => {
    console.log('[UserContext] Updating user profile:', {
      userId: user.id,
      accuracy: newAccuracy,
      speed: newSpeed,
      alltimeTotal: newAlltimeTotal
    });
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        accuracy: newAccuracy,
        speed: newSpeed,
        attempts: { total, correct, timeSum },
        alltime_total: newAlltimeTotal,
        alltime_correct: newAlltimeCorrect,
        alltime_time_sum: newAlltimeTimeSum,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('[UserContext] Failed to update user profile:', error);
      throw error;
    }
    
    console.log('[UserContext] User profile updated successfully:', data);
    return data;
  },
  'Update user performance'
);
```

---

### Fix 2: Online Duel Game End Synchronization

**File**: `src/hooks/useOnlineDuel.ts`

**Add a `restartGame` function** that properly resets the room for all players:

```typescript
// Add new function after finishGame (around line 578)
const restartGame = useCallback(async (newRoutes: RouteData[]) => {
  if (!room || !isHost) return false;

  try {
    const { data, error } = await supabase
      .from('duel_rooms')
      .update({
        status: 'playing',
        routes: newRoutes as any,
        current_route_index: 0,
        host_score: 0,
        guest_score: 0,
        player_3_score: 0,
        player_4_score: 0,
        game_started_at: new Date().toISOString(),
      })
      .eq('id', room.id)
      .select()
      .single();

    if (error) throw error;

    setRoom(data as unknown as OnlineDuelRoom);
    onGameStart?.(data as unknown as OnlineDuelRoom);
    return true;
  } catch (err) {
    console.error('[OnlineDuel] Error restarting game:', err);
    toast({
      title: 'Failed to restart game',
      variant: 'destructive',
    });
    return false;
  }
}, [room, isHost, toast, onGameStart]);
```

**File**: `src/pages/DuelMode.tsx`

**Update `handleRestart`** to use the new `restartGame` for online mode:

```typescript
const handleRestart = async () => {
  setIsLoading(true);
  
  try {
    const routes = await loadRoutesForSettings(settings);
    const shuffled = [...routes].sort(() => Math.random() - 0.5);
    const selectedRoutes = shuffled.slice(0, settings.routeCount);
    
    // For online mode, update the room in database
    if (settings.isOnline && onlineDuel.restartGame) {
      const success = await onlineDuel.restartGame(selectedRoutes);
      if (success) {
        setGameRoutes(selectedRoutes);
      }
    } else {
      // Local mode - just update local state
      setGameRoutes(selectedRoutes);
    }
  } catch (error) {
    console.error('Failed to reload routes:', error);
  }
  
  setIsLoading(false);
};
```

**File**: `src/components/duel/OnlineDuelGameView.tsx`

**Add Rematch button** to the game over screen (around line 242):

```typescript
<div className="flex gap-4">
  <Button variant="outline" onClick={onExit} className="flex-1">
    <Home className="h-4 w-4 mr-2" />
    Exit
  </Button>
  {/* Add Rematch button - only show for host */}
  {playerSlot === 'host' && onRematch && (
    <Button onClick={onRematch} className="flex-1">
      <RotateCcw className="h-4 w-4 mr-2" />
      Rematch
    </Button>
  )}
</div>
```

Also update the component props to accept `onRematch`:

```typescript
interface OnlineDuelGameViewProps {
  routes: RouteData[];
  room: OnlineDuelRoom;
  playerSlot: PlayerSlot;
  isMobile: boolean;
  onAnswer: (...) => Promise<void>;
  onExit: () => void;
  onFinishGame: () => Promise<void>;
  onRematch?: () => void; // New prop
}
```

**File**: `src/components/duel/DuelGame.tsx`

**Pass the rematch handler** to OnlineDuelGameView (around line 448):

```typescript
<OnlineDuelGameView
  routes={routes}
  room={activeRoom}
  playerSlot={onlineDuel.playerSlot || 'host'}
  isMobile={isMobile}
  onAnswer={onlineDuel.submitAnswer}
  onExit={onExit}
  onFinishGame={onlineDuel.finishGame}
  onRematch={onRestart} // Add this prop
/>
```

---

### Fix 3: Pre-fill Username for Logged-in Users

**File**: `src/components/duel/DuelSetupWizard.tsx`

**Initialize `playerName` with user's name** (around line 77):

```typescript
// Change from:
const [playerName, setPlayerName] = useState('');

// To:
const [playerName, setPlayerName] = useState(user?.name || '');

// Also add useEffect to update if user loads after mount:
useEffect(() => {
  if (user?.name && !playerName) {
    setPlayerName(user.name);
  }
}, [user?.name]);
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/context/UserContext.tsx` | Add detailed logging for user_profiles updates, verify updates succeed |
| `src/hooks/useOnlineDuel.ts` | Add `restartGame` function that resets scores and status in database |
| `src/pages/DuelMode.tsx` | Update `handleRestart` to call `restartGame` for online mode |
| `src/components/duel/OnlineDuelGameView.tsx` | Add Rematch button for host, add `onRematch` prop |
| `src/components/duel/DuelGame.tsx` | Pass `onRestart` as `onRematch` to OnlineDuelGameView |
| `src/components/duel/DuelSetupWizard.tsx` | Initialize `playerName` with `user?.name`, add useEffect to update on user load |

---

## Testing Checklist

1. **Leaderboard**: Play 5+ routes on Matera, verify user_profiles.updated_at changes
2. **Online Duel End**: Host finishes game, verify guest sees game over screen
3. **Online Duel Scores**: Verify all player scores display correctly on end screen
4. **Online Rematch**: Host clicks Rematch, verify all players restart with reset scores
5. **Pre-filled Name**: Log in, go to Duel > Online, verify name field is pre-filled
