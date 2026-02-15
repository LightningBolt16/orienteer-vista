

## Fixes and Features Plan

### Issue 1: Route Finder "All Maps" includes hidden maps (Erikslund)

**Root Cause**: In `RouteFinderGame.tsx`, when no `mapId` is provided (All Maps mode), the query fetches all challenges via `route_finder_challenges` joined with `route_finder_maps` but never filters out hidden maps. The RLS policy allows viewing challenges for any public map regardless of `is_hidden`.

**Fix**: Add `.eq('route_finder_maps.is_hidden', false)` to the query when loading all challenges (no specific `mapId`).

**File**: `src/components/route-finder/RouteFinderGame.tsx` (lines 101-112)

---

### Issue 2: Publish to Community button for Route Game private maps

**What exists**: The Route Finder already has a `PublishRouteFinderMapDialog` that updates `route_finder_maps` to set `is_public: true` and `map_category: 'community'`. The standard Route Game has a `PublishMapDialog` in `src/components/user-maps/` but it's only wired up in the UserMaps page (My Maps), not in the Route Game map selector.

**Solution**: Add a "Publish to Community" button on each private map card in the Route Game's map selector (in `RouteGame.tsx`). Since the existing `PublishMapDialog` expects a `user_maps.id` (looks up via `source_map_id`), we'll create a new lightweight `PublishRouteMapDialog` component that works directly with `route_maps.id`, similar to how the Route Finder dialog works.

**Files**:
- New file: `src/components/sharing/PublishRouteMapDialog.tsx` -- Dialog with title, description, location picker, and optional logo upload, updating `route_maps` directly by its ID
- `src/pages/RouteGame.tsx` -- Add publish dialog state, a Globe icon button on private map cards, and render the dialog

---

### Issue 3: Local Duel Quick Play broken on mobile

**Root Cause**: `buildQuickPlaySettings()` in `DuelSetupWizard.tsx` always sets `gameMode: 'speed'`. On mobile local mode, speed race is disabled (it requires two separate screens). When DuelGame receives `gameMode: 'speed'`, it enters independent mode where each player has their own route index. The `MobileDuelIndependentView` is rendered, which likely doesn't receive proper routes.

**Fix**: In `buildQuickPlaySettings()`, set `gameMode` to `'wait'` when `playMode === 'local'` and the device is mobile.

**File**: `src/components/duel/DuelSetupWizard.tsx` (line 172)

---

### Issue 4: Mobile Local Duel -- SafeZoneImage zoom not applied

**Root Cause**: `MobileDuelView.tsx` renders a plain `<img>` tag without using the `SafeZoneImage` component. The solo Route Game's mobile fullscreen uses `SafeZoneImage` for the two-layer architecture (transformed image + static UI overlay).

**Solution**: Integrate `SafeZoneImage` into `MobileDuelView` using the same two-layer approach:
- Image layer: `SafeZoneImage` with `isFullscreen={true}` renders the zoomed/centered map
- UI overlay: Static `absolute inset-0` div containing the L/R touch zones, score badges, and result indicators (unchanged positioning)

The `MobileDuelView` already receives `currentRoute` which contains `safeZone` data.

**File**: `src/components/duel/MobileDuelView.tsx`

---

### Issue 5: Swap L/R button colors for Player 2 in Mobile Local Duel

**Current behavior**: Both players have red=left, blue=right. Since Player 2 is rotated 180 degrees (sitting at the opposite end of the phone), their left/right are visually mirrored. The user wants the colors swapped for P2 so when both players look at the phone from their perspective, the spatial color mapping is consistent.

**Fix**: In the P2 section of `MobileDuelView.tsx`, swap the colors: left button becomes blue, right button becomes red. This means from P2's visual perspective (rotated), red is on their left and blue is on their right -- matching P1's perspective.

**File**: `src/components/duel/MobileDuelView.tsx` (lines 66-92)

---

### Summary of Changes

| File | Change |
|------|--------|
| `RouteFinderGame.tsx` | Filter out hidden maps in All Maps query |
| `PublishRouteMapDialog.tsx` (new) | Publish dialog for Route Game private maps |
| `RouteGame.tsx` | Wire up publish dialog on private map cards |
| `DuelSetupWizard.tsx` | Fix Quick Play to use `wait` mode on mobile local |
| `MobileDuelView.tsx` | Integrate SafeZoneImage zoom + swap P2 button colors |

