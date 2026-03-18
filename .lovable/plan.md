

## Multi-Route Support in Duel Mode

### Problem
1. **Duel answer system is binary (left/right)** — `DuelGame`, `DuelPlayerPanel`, `MobileDuelView`, `MobileDuelIndependentView`, and `OnlineDuelGameView` all use `'left' | 'right'` for answers, but multi-route maps have up to 4 routes requiring index-based answers (0-3).
2. **Mobile local duel shows only 2 buttons** — multi-route maps (3-4 routes) can't be played with just L/R on a shared screen.
3. **Desktop and online views also only show 2 buttons** — `DuelPlayerPanel` renders only left/right chevrons; `OnlineDuelGameView` renders only left/right arrows.

### Plan

#### 1. Filter multi-route maps from mobile local duel
In `DuelGame.tsx` and the route-fetching logic in `DuelMode.tsx` (or wherever routes are loaded for duel), filter out routes where `numAlternates > 1` when playing **mobile + local** mode. This ensures mobile local games only get standard 2-route choices.

Alternatively, apply the filter in the setup: when `isMobile && playMode === 'local'`, mark maps known to have multi-routes as unavailable (with a lock icon and tooltip like "Multi-route maps require desktop or online play"). This is the better UX since users see *why* a map is locked. The filter needs to happen at the route level though (since a single map can have both 2-route and multi-route candidates). So: filter **routes** with `numAlternates > 1` out of the route pool when `isMobile && settings.gameMode === 'wait'` (local mobile).

#### 2. Convert answer system from `'left'|'right'` to numeric index
This is the core change across multiple files:

- **`DuelGame.tsx`**: Change `handlePlayerAnswer` signature from `(player, direction: 'left'|'right')` to `(player, answerIndex: number)`. Update `PlayerState.lastAnswer` from `'left'|'right'|null` to `number|null`. Update correctness check from `direction === shortestSide` to `answerIndex === (route.mainRouteIndex ?? (route.shortestSide === 'left' ? 0 : 1))`. Update `processRoundResults` similarly.

- **`DuelPlayerPanel.tsx`**: Accept `numAlternates` (or `totalRoutes`) prop. Render 2-4 buttons dynamically based on route count. For 2 routes: left/right as today. For 3-4 routes: position buttons at left, right, top, (bottom). Change `onSelectDirection` to `onSelectAnswer(index: number)`. Use the same color scheme as `MobileRouteSelector` (`ROUTE_COLORS`).

- **`MobileDuelView.tsx`**: This is the shared-screen local mobile view. Since we're filtering multi-routes out for mobile local, this can stay as-is with 2 buttons only. But update the callback type to pass index (0 or 1) instead of `'left'|'right'`.

- **`MobileDuelIndependentView.tsx`**: Same — mobile independent mode. Filter ensures only 2-route maps, so keep 2 buttons but update type to index.

- **`OnlineDuelGameView.tsx`**: Accept route's `numAlternates`/`mainRouteIndex`. Render 2-4 buttons dynamically (same layout as `DuelPlayerPanel`). Change `handleDirectionSelect` to `handleAnswerSelect(index: number)`. Update correctness check. Also update keyboard shortcuts: for 2 routes use left/right arrows, for 3+ add up/down arrows.

- **Keyboard controls in `DuelGame.tsx`**: For desktop local, Player 1 uses A/D (+ W/S for up/down on 3-4 routes), Player 2 uses arrow keys (+ up/down).

#### 3. Update online answer submission
`OnlineDuelHook.submitAnswer` currently takes `answer: 'left' | 'right'`. Change to `answer: number` (the selected index). The `isCorrect` boolean is already passed separately, so the DB storage just needs the answer value updated.

#### 4. Files to modify

| File | Change |
|------|--------|
| `DuelGame.tsx` | Answer type from direction to index; filter multi-routes for mobile local; keyboard bindings for 3-4 routes |
| `DuelPlayerPanel.tsx` | Dynamic 2-4 button rendering; accept `totalRoutes` prop |
| `MobileDuelView.tsx` | Change callback type to index (keep 2 buttons only) |
| `MobileDuelIndependentView.tsx` | Change callback type to index (keep 2 buttons only) |
| `OnlineDuelGameView.tsx` | Dynamic 2-4 buttons; answer index; keyboard for 3-4 routes |
| `useOnlineDuel.ts` | Change `submitAnswer` type from `'left'|'right'` to `number` |
| `DuelSetup.tsx` / `DuelSetupWizard.tsx` | No changes needed (map filtering happens at route level, not setup) |

#### 5. Button layout for 3-4 routes (desktop/online)

```text
For DuelPlayerPanel & OnlineDuelGameView:

2 routes:          3 routes:           4 routes:
                      [▲ Top]           [▲ Top]
[◄ Left] [Right ►] [◄ L] [R ►]    [◄ L] [R ►]
                                      [▼ Bottom]
```

Use the same `ROUTE_COLORS` array: `['#FF5733', '#3357FF', '#33CC33', '#9933FF']` matching `RouteSelector` and `MobileRouteSelector`.

