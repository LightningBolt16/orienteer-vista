

# Show Both User Path and Correct Route on Result Screen

## Problem

When you draw a route in Route Finder and submit it, the result screen only shows the pre-rendered "answer image" with the correct route. You cannot see:
1. How the game interpreted (snapped) your freehand drawing
2. A side-by-side comparison of your route vs the correct route

This makes it confusing when you drew what you thought was correct, but the game marked it wrong.

## Solution

Modify the result screen to draw both paths as canvas overlays on the base map image:
- **Your drawn route (snapped)**: Shown in magenta/pink
- **Correct route**: Shown in green

This way you can directly compare where your route differed from the optimal one.

---

## Implementation Details

### File to Modify: `src/components/route-finder/RouteFinderResult.tsx`

**Changes:**
1. Import `getPathCoordinates` from `routeFinderUtils` to convert node IDs to x,y coordinates
2. Replace the static answer image with the base image + canvas overlay
3. Draw both paths on the canvas:
   - User's snapped path in magenta (same color as when drawing)
   - Optimal path in green (showing the correct answer)
4. Add a legend explaining which color is which
5. Accept `baseImageUrl` as an additional prop (passed from `RouteFinderGame`)

### File to Modify: `src/components/route-finder/RouteFinderGame.tsx`

**Changes:**
1. Pass `baseImageUrl` to `RouteFinderResult` in addition to `answerImageUrl`

---

## Visual Design

```text
+------------------------------------------+
|  [Score: 2/5]              [Time: 3.2s]  |
|                                          |
|                                          |
|     +--------------------------+         |
|     |                          |         |
|     |   MAP WITH TWO ROUTES    |         |
|     |   ---- Magenta = Yours   |         |
|     |   ---- Green = Correct   |         |
|     |                          |         |
|     +--------------------------+         |
|                                          |
|    Legend:                               |
|    [---] Your route  [---] Correct       |
|                                          |
|    "Not the shortest route"              |
|    "Compare your route (pink) with       |
|     the correct route (green)"           |
|                                          |
|         [Next Challenge ->]              |
+------------------------------------------+
```

---

## Technical Approach

The result component will:

1. **Load the base image** (clean map without any routes drawn)
2. **Create a canvas overlay** sized to match the displayed image
3. **Convert node IDs to coordinates** using `getPathCoordinates(userPath, graph)` and `getPathCoordinates(optimalPath, graph)`
4. **Draw both paths** with different colors and line styles:
   - User path: Magenta, solid line
   - Optimal path: Green, slightly thicker or dashed for contrast
5. **Handle scaling** - coordinates are in image pixels, need to scale to canvas display size

This approach uses the same drawing logic as the existing `RouteDrawingCanvas` component, ensuring consistency.

