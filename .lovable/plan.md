

## Fix Route Game Mobile Display -- Proper Safe Zone Zoom

### Root Cause Analysis

The current `AdaptiveCropImage` has a binary approach:
- If the safe zone fits the container ratio within the 1x1 image bounds: zoom in (works well)
- If it doesn't fit (needsLetterbox = true): show the **entire image** with `object-contain`

That second case is the bug. On mobile portrait (aspect ratio ~0.46), most safe zones trigger the letterbox path because the required vertical region exceeds the image height. The fallback shows the full 1:1 image squeezed into a portrait container, resulting in a tiny image offset to one side with large black bars.

**A center point in the CSV is NOT needed** -- the center is already `(x + w/2, y + h/2)` from the existing safe zone data.

### The Fix

Replace the binary zoom-or-full-image logic with a single unified approach that **always zooms to the safe zone**, clamping to image bounds when needed:

```text
Given: padded safe zone {x, y, w, h}, container aspect ratio R

Step 1: Compute minimum region containing safe zone with ratio R
  if (w/h > R): regionW = w, regionH = w / R
  else:         regionH = h, regionW = h * R

Step 2: Clamp to image bounds
  regionW = min(regionW, 1.0)
  regionH = min(regionH, 1.0)
  // Actual displayed ratio = regionW / regionH
  // Thin letterbox bars appear only if this differs from R

Step 3: Center region on safe zone center
  cx = x + w/2, cy = y + h/2
  left = clamp(cx - regionW/2, 0, 1 - regionW)
  top  = clamp(cy - regionH/2, 0, 1 - regionH)

Step 4: Render with absolute positioning (always zoomed)
  img width  = (100 / regionW)%
  img height = (100 / regionH)%
  img left   = -(left / regionW * 100)%
  img top    = -(top  / regionH * 100)%
  container aspectRatio = regionW / regionH
```

This means:
- Routes always display zoomed into the safe zone area
- No more falling back to showing the full tiny image
- Thin letterbox bars only appear at container edges when the cropped region's ratio doesn't match the screen
- The safe zone is always centered

### Files to Change

**1. `src/components/map/AdaptiveCropImage.tsx`**
- Rewrite the `zoomData` calculation to use the unified approach above
- Remove the `needsLetterbox` boolean and the fallback `object-contain` render path
- Always render with absolute positioning zoom
- Container uses `aspectRatio = regionW / regionH` with `bg-black` for any remaining bars
- Fullscreen container uses `w-full h-full` with the image zoomed via absolute positioning

**2. `src/components/MobileRouteSelector.tsx`**
- Ensure the fullscreen wrapper properly fills the screen without conflicting flex centering
- The `flex items-center justify-center` on the wrapper should work with the new approach since the AdaptiveCropImage container will have the correct aspect ratio

### What This Solves
- Images left-aligned with black space on the right: gone (safe zone is always centered)
- Background visible behind map in fullscreen: gone (container fills screen, image zooms to fill)
- Routes showing too small: gone (always zooms to safe zone, never shows full image)

