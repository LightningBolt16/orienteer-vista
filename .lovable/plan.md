

# Fix Plan: Route Game Cropping, Route Finder UI, and Map Overwrite Verification

## Issue 1: Safe Zone Data Not Being Saved (Route Game Cropping)

**Root Cause**: All `safe_zone` values in the database are NULL for every map, including Solang which was uploaded with the new CSV format. The parsing code and insert code look syntactically correct, so the most likely cause is one of:

- The TypeScript cast `(route.safeZone as unknown as Record<string, number>)` may be causing serialization issues with how Supabase JS SDK handles JSONB
- The deployed code at the time of upload may not have included the safe_zone changes yet

**Evidence**: Database query confirms all 500 Solang route_images have `safe_zone = NULL` despite the CSV containing Safe_X/Y/W/H columns.

**Fix**:
1. Remove the unnecessary `as unknown as Record<string, number>` cast -- just pass the object directly, which Supabase SDK handles natively as JSONB
2. Add a `console.log` during upload to confirm safe_zone values are being parsed from the CSV (for debugging future uploads)
3. Improve `AdaptiveCropImage` fallback: when a 1:1 image has NO safe zone, use `object-cover` with a default centered safe zone (e.g., `{x: 0.1, y: 0.1, w: 0.8, h: 0.8}`) instead of `object-contain`, so the image still fills the screen reasonably

**Files**: `src/hooks/useMapUpload.ts`, `src/components/map/AdaptiveCropImage.tsx`

---

## Issue 2: Route Finder -- Fullscreen Button Not Working

**Root Cause**: The button renders and hovers correctly but clicking does nothing. The `variant="ghost"` button is only 24x24px (`h-6 w-6`). Additionally, when `isFullscreen` toggles, the component key changes from `inline-${mapId}` to `fullscreen-${mapId}`, causing a full remount that loses game state.

**Fix**:
1. Make the fullscreen button larger (`h-8 w-8`) with `variant="secondary"` for visibility
2. Add `e.stopPropagation()` to the onClick handler for safety
3. Use the same key for both inline and fullscreen modes to preserve game state during transitions

**Files**: `src/pages/RouteFinder.tsx`, `src/components/route-finder/RouteFinderGame.tsx`

---

## Issue 3: Route Finder -- Layout Redesign

**Current problem**: The game has a `bg-black` flex column with top bar, map area, and bottom bar. The map area still shows black bars (letterboxing) and the overall design feels cramped.

**Requested design**:
- Map fills the entire map component area -- no black bars
- Info bar (progress, map name, stats) sits ABOVE the map, outside it
- Control buttons (Undo, Clear, Submit) sit BELOW the map, outside it, centered

**Fix**:
1. In `RouteFinderGame.tsx`:
   - Top bar: clean, minimal with white/muted background. Contains: progress counter (left), map name + impassable warning (center), stats + fullscreen/debug buttons (right)
   - Map area: `flex-1` with the drawing canvas filling it entirely using `object-contain` for the background image
   - Bottom bar: centered Undo/Clear/Submit buttons with proper styling, outside the map
   - Remove `bg-black` from the outer container, use `bg-background` instead

2. In `RouteDrawingCanvas.tsx`:
   - Keep it as a pure drawing surface
   - The image uses `object-contain` which already handles aspect ratios correctly
   - Add the red vignette overlay when `onImpassableWarning` fires

**Files**: `src/components/route-finder/RouteFinderGame.tsx`, `src/components/route-finder/RouteDrawingCanvas.tsx`

---

## Issue 4: Impassable Terrain Feedback

**Requested behavior**: When drawing over impassable terrain, show ALL THREE simultaneously:
1. Text warning ("Impassable terrain!") in the top info bar, centered
2. Red hue/vignette around the edges of the map
3. A warning triangle icon next to the text

**Fix**:
1. In the top bar of `RouteFinderGame.tsx`: show `AlertTriangle` icon + "Impassable terrain!" text in red when `showImpassableWarning` is true
2. In `RouteDrawingCanvas.tsx`: add a `pointer-events-none` overlay div with `radial-gradient(ellipse at center, transparent 60%, rgba(239, 68, 68, 0.3) 100%)` that appears when the warning is active
3. The warning state is already managed via the `onImpassableWarning` callback -- just need to wire up all three visual indicators

**Files**: `src/components/route-finder/RouteFinderGame.tsx`, `src/components/route-finder/RouteDrawingCanvas.tsx`

---

## Issue 5: Map Overwrite Verification

**Status**: Ekeby and Matera exist in the database with new created_at timestamps (Feb 12 and Feb 11), suggesting the overwrite DID work -- old records were deleted and new ones inserted. However, the safe_zone is NULL for all of them, which means the overwrite succeeded but the safe_zone data wasn't saved (same root cause as Issue 1).

---

## Verification Plan

After implementing all changes, I will:
1. Navigate to the Route Finder page in the sandbox browser
2. Verify the fullscreen button is clickable and works
3. Verify the layout has controls above and below the map, not overlaying it
4. Navigate to the Route Game to verify AdaptiveCropImage fallback looks correct for 1:1 images without safe zones

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/hooks/useMapUpload.ts` | Remove unnecessary type cast on safe_zone, add console.log for debugging |
| `src/components/map/AdaptiveCropImage.tsx` | Better fallback for 1:1 images without safe zone: use cover with default safe zone instead of contain |
| `src/pages/RouteFinder.tsx` | Use stable key for game component, fix fullscreen container |
| `src/components/route-finder/RouteFinderGame.tsx` | Redesign layout: top bar (outside map), map area (full), bottom bar (outside map). Bigger fullscreen button. Add AlertTriangle + text for impassable warning |
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Add red vignette overlay for impassable warning |

After implementing, you will need to re-upload Solang (and Ekeby/Matera if you want safe zones) with the updated code to get the safe_zone values saved correctly.

