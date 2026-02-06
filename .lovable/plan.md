

# Route Finder Improvements Plan

## Overview
This plan addresses six distinct issues with the Route Finder game mode to align it with the Route Game and fix bugs.

---

## Issues to Fix

### 1. Fullscreen Not Working
**Problem**: The fullscreen mode in Route Finder is broken. The game container ref isn't properly attached and the fullscreen toggle doesn't work correctly.

**Solution**:
- Move the `gameContainerRef` to wrap the game section properly (similar to RouteGame.tsx lines 700-733)
- Ensure the fullscreen mode takes over the entire screen with proper styling
- Fix the CSS fallback for mobile devices

**Files**: `src/pages/RouteFinder.tsx`

---

### 2. Missing Private and Community Map Sections
**Problem**: The Route Finder map selector doesn't have the collapsible private/community sections like the Route Game has.

**Solution**:
- Add hooks to load user's private Route Finder maps from `route_finder_maps` where `user_id = auth.uid()` and `is_public = false`
- Add hooks to load favorited community Route Finder maps (needs new favorites table or column)
- Add collapsible sections matching RouteGame.tsx structure (lines 507-681)
- Include CommunityMapBrowser integration for Route Finder maps

**Files**:
- `src/pages/RouteFinder.tsx` - Add private/community map loading
- `src/components/route-finder/RouteFinderMapSelector.tsx` - Add sections

---

### 3. Publishing System for Route Finder
**Problem**: No way to publish private Route Finder maps to community, unlike Route Choice.

**Solution**:
- Create `PublishRouteFinderMapDialog.tsx` similar to existing `PublishMapDialog.tsx`
- Allow setting title, description, location via Mapbox picker
- Update `route_finder_maps` to set `is_public = true`, `map_category = 'community'`
- Add publish button to the Route Finder private maps section

**Files**:
- Create `src/components/route-finder/PublishRouteFinderMapDialog.tsx`
- Update `src/pages/RouteFinder.tsx` to include publish functionality

---

### 4. Header Text Formatting
**Problem**: Header says "routeFinder" instead of "Route Finder" (camelCase vs proper title).

**Solution**:
- Change any instance of "routeFinder" title text to "Route Finder"
- Ensure the CardTitle in the map selection section says "Route Finder"

**Files**: `src/pages/RouteFinder.tsx`

---

### 5. Frontend Markers Override Backend Markers
**Problem**: The frontend `RouteDrawingCanvas.tsx` is drawing its own green triangle and red circle markers on top of the map, overriding the magenta markers from the server-generated images. The user wants the **server-side processing script** to make the markers bigger, not the frontend to draw different colored markers.

**Current State**:
- Server generates images with magenta triangle (start) and magenta double-circle (finish) using `MARKER_RADIUS` parameter (default 40px)
- Frontend is drawing additional green/red markers on top (lines 199-247 of RouteDrawingCanvas.tsx)

**Solution**:
- **Remove frontend marker drawing entirely** from `RouteDrawingCanvas.tsx` - the server-generated base image already has the markers
- Increase the default `MARKER_RADIUS` in the Modal processing script from 40 to 60 (or make it configurable in the admin parameters form)
- The markers on the processed images will appear larger

**Files**:
- `src/components/route-finder/RouteDrawingCanvas.tsx` - Remove the startMarker and finishMarker drawing code (lines 199-247)
- `docs/modal-processor-route-finder.py` - Increase default MARKER_RADIUS from 40 to 60

---

### 6. Debug Mode: Show Graph Intersection Points
**Problem**: Debug mode only shows the impassability mask. User wants to see all graph junction/intersection points to verify the undo-to-last-intersection feature will work.

**Solution**:
- In debug mode, render all graph nodes (intersections) as small circles on the canvas
- Filter to show only junction nodes (nodes where graph degree != 2, i.e., intersections)
- Draw these as small purple/cyan dots overlaid on the map

**Files**:
- `src/components/route-finder/RouteDrawingCanvas.tsx` - Add graph nodes overlay in debug mode
- `src/components/route-finder/RouteFinderGame.tsx` - Pass graph data to the canvas when debug mode is active

---

## Technical Details

### Route Finder Private/Community Map Loading

```typescript
// In RouteFinder.tsx - add query for private maps
const loadPrivateMaps = async () => {
  if (!user) return;
  const { data } = await supabase
    .from('route_finder_maps')
    .select(`
      id, name, description, country_code, location_name,
      route_finder_challenges(id)
    `)
    .eq('user_id', user.id)
    .eq('is_public', false);
  // Transform and set state
};
```

### Removing Frontend Markers (RouteDrawingCanvas.tsx)

Remove lines 199-247 that draw the start triangle and finish double circle. The props `startMarker` and `finishMarker` can remain for coordinate reference if needed for the undo feature, but no visual rendering.

### Debug Mode Graph Nodes

```typescript
// In RouteDrawingCanvas - add prop for graph nodes
graphNodes?: { id: string; x: number; y: number }[];

// In debug mode overlay
{debugMode && graphNodes && (
  // Draw each node as a small dot
  graphNodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(
      imageBounds.x + node.x * scaleX,
      imageBounds.y + node.y * scaleY,
      4, 0, Math.PI * 2
    );
    ctx.fillStyle = '#00FFFF';
    ctx.fill();
  });
)}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/pages/RouteFinder.tsx` | Fix fullscreen, add private/community map sections, fix header text |
| `src/components/route-finder/RouteFinderMapSelector.tsx` | Add collapsible private/community sections with proper styling |
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Remove frontend marker drawing, add debug graph nodes overlay |
| `src/components/route-finder/RouteFinderGame.tsx` | Pass graph nodes to canvas for debug mode |
| `src/components/route-finder/PublishRouteFinderMapDialog.tsx` | New dialog for publishing Route Finder maps |
| `docs/modal-processor-route-finder.py` | Increase default MARKER_RADIUS from 40 to 60 |

---

## Post-Implementation Notes

1. **Modal Redeploy Required**: After updating `modal-processor-route-finder.py`, run `modal deploy docs/modal-processor-route-finder.py`
2. **Map Reprocessing**: Existing maps will keep their current marker size. New maps or reprocessed maps will use the larger markers.
3. **Community Favorites**: May need a new `route_finder_favorites` table or extend the existing `community_map_favorites` to support Route Finder maps.

