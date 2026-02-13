

## Fix Route Game Mobile Fullscreen Issues + Short Route Priority

### Problems Identified

1. **Header overlaps fullscreen**: The header uses `z-50` and the fullscreen container also uses `z-50`, so the header shows on top of the fullscreen game.
2. **Left-aligned map with black space on right**: In fullscreen, the `AdaptiveCropImage` zoom calculation works correctly for the math, but the container hierarchy (MobileRouteSelector wrapping in `flex items-center justify-center` + AdaptiveCropImage's absolute positioning) causes misalignment. The image container gets `w-full h-full` but the parent flex centering conflicts with the absolute-positioned image inside.
3. **Shorter routes first before fullscreen**: Safe zone area (`w * h`) correlates with route length -- smaller area = shorter, more compact route that displays well on small screens without fullscreen.

### Plan

#### 1. Fix fullscreen z-index (RouteGame.tsx)
- Change fullscreen wrapper from `z-50` to `z-[60]` so it renders above the fixed header.

#### 2. Fix fullscreen image alignment (AdaptiveCropImage.tsx)
- In fullscreen mode with `hasLetterbox`, center the image properly using `flex items-center justify-center` on the container and switch from absolute positioning to `object-contain` with max dimensions, so the image is always centered regardless of aspect mismatch.
- When there's no letterbox (image fills container), keep the current absolute positioning zoom approach.

#### 3. Sort routes by safe zone area for non-fullscreen (routeDataUtils.ts)
- After loading routes, sort so that routes with smaller safe zone areas (shorter, compact routes) appear first. This ensures the initial routes shown before fullscreen are easy to see.
- Only apply this sort when routes are first loaded (before shuffle/randomization).

### Technical Details

**File: `src/pages/RouteGame.tsx`**
- Line 700: Change `z-50` to `z-[60]` on the fullscreen section wrapper.

**File: `src/components/map/AdaptiveCropImage.tsx`**
- Fullscreen branch (line 132-151): When `hasLetterbox` is true, instead of using absolute positioning (which misaligns), render the image with `object-contain` + `max-w-full max-h-full` centered in the container. This guarantees centering without complex positioning math.
- Keep the zoom approach (absolute positioning) only when the image can fully fill the container (`!hasLetterbox`).

**File: `src/utils/routeDataUtils.ts`**
- After building the routes array (around line 377), sort routes by safe zone area ascending (smallest safe zones first = shortest routes). Routes without safe zones go to the end.

