

## Route Finder Safe Zone Zoom + Route Length Filtering

### Problem Summary
1. Route Finder doesn't use `SafeZoneImage` zoom in fullscreen for 1:1 maps — it just shows the raw square image via `RouteDrawingCanvas`
2. In non-fullscreen, 1:1 square images don't fill the available width (letterboxed)
3. No route length filtering exists — want shortest 50% in non-fullscreen, all routes in fullscreen

---

### Phase 1: Safe Zone Zoom for Route Finder (Fullscreen)

The core challenge: Route Finder needs an interactive drawing canvas on top of the map, unlike Route Game which is just tap-to-select. The `SafeZoneImage` component applies CSS transforms (scale + translate) to zoom into the safe zone. We need the drawing canvas to use the same transform so coordinates stay aligned.

**Approach**: Wrap both the image and the drawing canvas inside a single transformed container, similar to how `SafeZoneImage` works.

**Changes to `RouteFinderGame.tsx`**:
- Add `safe_zone` to the `Challenge` interface (it's already in DB/types but not loaded)
- Include `safe_zone` in the query select
- Pass `safe_zone` and `isFullscreen` to `RouteDrawingCanvas`

**Changes to `RouteDrawingCanvas.tsx`**:
- Accept new props: `safeZone`, `isFullscreen`
- When `isFullscreen && safeZone && aspect_ratio === '1_1'`: compute the same scale/translate transform as `SafeZoneImage` and apply it to a wrapper div around both the image and all canvas layers
- Adjust `calculateImageBounds` to account for the transform so drawing coordinates remain accurate
- The key insight: the transform is applied to a parent container, so `getPointFromEvent` needs to factor in the scale when converting screen coords to normalized coords

**Non-fullscreen width fix**:
- Currently the canvas container is `relative w-full h-full` — for 1:1 images on wide screens, the image gets height-constrained and doesn't use full width
- When not fullscreen and image is 1:1, set the container to use a more appropriate aspect ratio or remove height constraints so the square fills the width

### Phase 2: Non-Fullscreen Layout Fix

In the `RouteFinderGame` component, the map area is `flex-1 relative min-h-0`. For a 1:1 image, `object-contain` shrinks it to fit the height, leaving horizontal dead space.

**Fix**: When the challenge is 1:1 aspect ratio and not fullscreen, constrain the map area container to `aspect-square` so the image fills the full width, and let the page scroll if needed rather than leaving empty space.

### Phase 3: Route Length Filtering (Both Game Modes)

**Route Game** (Route Choice): Routes have `mainRouteLength` in `RouteData`. When not fullscreen, sort all loaded routes by `mainRouteLength`, take the bottom 50% (shortest half), and only cycle through those. In fullscreen, use all routes.

**Route Finder**: Challenges have `optimal_length`. Same logic — when not fullscreen, filter to shortest 50% of challenges. In fullscreen, show all.

**Implementation**:

For **Route Game** (`RouteGame.tsx` / `RouteSelector.tsx` / `MobileRouteSelector.tsx`):
- Add a filtering step after routes are loaded: sort by `mainRouteLength`, take the shortest half
- When `isFullscreen` changes, update the active route set
- Need to be careful not to reset progress mid-game — apply filter only when loading new routes

For **Route Finder** (`RouteFinderGame.tsx`):
- After `loadChallenges`, sort by `optimal_length` and take shortest 50% when not fullscreen
- When toggling fullscreen, reload/refilter the challenges list
- Store both full and filtered lists to avoid re-fetching

**Shared utility** in a new helper or inline:
```typescript
function filterShortestHalf<T>(items: T[], getLength: (item: T) => number): T[] {
  const sorted = [...items].sort((a, b) => getLength(a) - getLength(b));
  return sorted.slice(0, Math.ceil(sorted.length / 2));
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Add `safeZone`/`isFullscreen` props, apply CSS transform for zoom, adjust coordinate math |
| `src/components/route-finder/RouteFinderGame.tsx` | Load `safe_zone`, pass to canvas, filter challenges by length based on fullscreen state |
| `src/pages/RouteGame.tsx` | Filter routes by `mainRouteLength` (shortest 50%) when not fullscreen |
| `src/components/RouteSelector.tsx` | Accept filtered routes |
| `src/components/MobileRouteSelector.tsx` | Accept filtered routes |

### Risks and Mitigations
- **Drawing coordinate alignment with zoom**: The scale transform changes the coordinate space. `getPointFromEvent` must divide by the scale factor. This is the trickiest part — will need careful testing.
- **Route filtering edge cases**: Maps with only 1-2 routes should show all. The `Math.ceil` in the filter ensures at least 1 route survives.
- **Fullscreen toggle mid-game**: For Route Finder, switching fullscreen should not reset the current challenge, just change the available pool for subsequent challenges.

