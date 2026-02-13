

## Fix Route Image Display -- The Real Root Cause and Solution

### What's Actually Happening

I navigated to the route game on both desktop (1920x1080) and mobile (390x844) and can see the exact same bug: **the map image does not fill the full container width**. There's empty white space on the right side, and arrow buttons float outside the map.

### The Root Cause: CSS `aspect-ratio` + `max-height` Conflict

The image container in `AdaptiveCropImage.tsx` currently uses these CSS properties together:

```css
width: 100%;
aspect-ratio: 0.54;  /* portrait ratio for a tall safe zone */
max-height: 75vh;
```

Here's what goes wrong:
1. `width: 100%` makes the container e.g. 896px wide (on desktop)
2. `aspect-ratio: 0.54` wants the height to be 896 / 0.54 = 1659px
3. `max-height: 75vh` = 810px clips the height to 810px
4. **But width stays at 896px** -- the aspect ratio is broken
5. The image positioning math assumes the container maintains the exact ratio, so the image is positioned for a 0.54 ratio container, but the real container is 896x810 (ratio 1.1)
6. Result: image is offset/misaligned with empty space on the right

This is a fundamental CSS behavior: when `width`, `aspect-ratio`, and `max-height` all constrain a box, the browser does NOT shrink the width to maintain the ratio. It just clips the height.

### The Fix: Calculate Explicit Pixel Dimensions in JavaScript

Instead of relying on CSS `aspect-ratio` + `max-height` (which conflict), compute the exact container width and height in pixels in the `useMemo`, and set them as inline styles. This guarantees the container always has the correct ratio.

### Bonus Fix: RouteSelector Crash Guard

The console shows a crash in `RouteSelector` (desktop) because `currentRoute` can be `undefined` when route data changes. `MobileRouteSelector` already has a guard for this, but `RouteSelector` does not.

### Technical Details

**File: `src/components/map/AdaptiveCropImage.tsx`**

In the `zoomData` `useMemo`, after computing `containerRatio`, also compute `containerWidth` and `containerHeight` in pixels:

```typescript
// Calculate explicit pixel dimensions to avoid CSS aspect-ratio + max-height conflict
const heightFromRatio = cw / containerRatio;
let containerWidth: number, containerHeight: number;

if (heightFromRatio <= maxH) {
  // Fits within max height
  containerWidth = cw;
  containerHeight = heightFromRatio;
} else {
  // Height-limited: shrink width to maintain ratio
  containerHeight = maxH;
  containerWidth = maxH * containerRatio;
}
```

Return these from `zoomData` and use them as inline styles:

Non-fullscreen render:
```html
<div style={{
  position: 'relative',
  overflow: 'hidden',
  width: `${containerWidth}px`,
  height: `${containerHeight}px`,
  margin: '0 auto',  /* center when narrower than parent */
}}>
  <img style={imgStyle} ... />
</div>
```

For fullscreen, similar explicit calculation using screen dimensions instead of `cw`/`maxH`.

The outer wrapper div keeps `w-full` for measuring, but the actual image container uses explicit pixel dimensions with `margin: 0 auto` for centering.

**File: `src/components/RouteSelector.tsx`**

Add a guard at line 215-216, same pattern as MobileRouteSelector:
```typescript
const currentRoute = routeData[currentRouteIndex];
if (!currentRoute) {
  return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
}
```

### What This Solves

- **No more white space on the right**: Container is exactly the right size, centered with `margin: 0 auto`
- **Works on all screen sizes**: The JS calculation handles every aspect ratio correctly
- **No CSS conflicts**: No reliance on CSS `aspect-ratio` property at all
- **Desktop crash fixed**: Guard prevents `undefined` access on `currentRoute`

