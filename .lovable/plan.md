

# Fix: Route Finder Fullscreen + Result Screen Redesign

## Problem 1: Fullscreen button does nothing

The fullscreen toggle in `RouteFinder.tsx` (line 229) has this condition:

```
if (isFullscreen && selectedMapId)
```

When playing in "All Maps" mode, `selectedMapId` is `null`, so the fullscreen container never renders even though `isFullscreen` becomes `true`. The fix is to remove the `selectedMapId` requirement -- fullscreen should work regardless of map selection mode.

## Problem 2: Result screen covers the map

The current `RouteFinderResult` component overlays everything (score circle, stats panel, legend, feedback message, next button) directly on top of the answer image, making it hard to see the correct route. The user wants it to match the drawing screen's clean three-section layout.

## Solution

### File 1: `src/pages/RouteFinder.tsx`
- Change line 229 from `if (isFullscreen && selectedMapId)` to just `if (isFullscreen)`
- Update the fullscreen `RouteFinderGame` key and `mapId` to handle null `selectedMapId` (pass `undefined`)

### File 2: `src/components/route-finder/RouteFinderResult.tsx`
Redesign to match the drawing screen's three-section layout:

- **Top bar** (outside the map, solid background): Score percentage (color-coded), feedback text, stats (correct/total), response time, and the route legend -- all in a single compact bar
- **Map area** (middle, flex-1): The answer image with user path canvas overlay fills the entire remaining space. No overlaid UI elements blocking the view
- **Bottom bar** (outside the map, solid background): Centered "Next Challenge" button

This keeps the map completely unobstructed so the user can clearly compare their magenta route against the correct red route.

## Technical Details

| File | Change |
|------|--------|
| `src/pages/RouteFinder.tsx` | Remove `selectedMapId` guard from fullscreen condition (line 229). Update key/mapId for null case. |
| `src/components/route-finder/RouteFinderResult.tsx` | Complete redesign: move all overlay elements into top/bottom bars outside the map area, matching the drawing screen layout. |
