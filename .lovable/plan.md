

## Fullscreen Mode Refactor

### Problem
The `SafeZoneImage` component applies a CSS `transform: scale() translate()` to a wrapper div that contains both the map image AND the UI overlays (arrow buttons, result icons, touch zones). This causes:
- **Desktop**: Buttons and result overlay are scaled/translated with the image, pushing them off-screen and making them jump between routes with different safe zones
- **Mobile**: Result icons inherit the image scale making them oversized; the container isn't truly fullscreen (`fixed inset-0` with proper z-index)
- **Mobile**: Red/blue edge hues are children of the transformed container, so they get distorted or hidden

### Solution
Separate the image transform layer from the UI overlay layer. Two distinct layers:
1. **Image layer**: Gets the `scale + translate` transform (only the `<img>`)
2. **UI layer**: A separate `absolute inset-0` div on top, with NO transform, containing buttons, result overlays, and touch zones

### Technical Changes

**1. `SafeZoneImage.tsx` -- Remove children from transform**
- The component will ONLY render the image with the zoom transform
- Remove the `children` prop entirely
- In fullscreen mode, render just the transformed image inside the overflow-hidden container
- Export the `useFullscreenTransform` calculation as a hook or keep the component focused solely on the image

**2. `RouteSelector.tsx` (Desktop) -- Restructure fullscreen layout**
- Wrap everything in a `fixed inset-0 z-[60] bg-black` container when fullscreen
- Inside: render `SafeZoneImage` (no children) for the zoomed map
- On top: a separate `absolute inset-0` overlay div (no transform) containing:
  - Result overlay (centered via flexbox, always viewport-centered)
  - Arrow buttons (positioned via absolute positioning relative to viewport, not the image)
- This guarantees buttons stay at screen edges and result icons stay centered regardless of safe zone position

**3. `MobileRouteSelector.tsx` (Mobile) -- Restructure fullscreen layout**
- Same separation: `fixed inset-0 z-[60] bg-black` for true fullscreen
- `SafeZoneImage` renders only the zoomed image
- Separate overlay div for:
  - Touch zones (left/right halves of the actual viewport)
  - Arrow indicators (positioned at viewport edges)
  - Result overlay with mobile-appropriate icon sizes (`h-12 w-12` instead of `h-16 w-16`)
  - Red/blue edge glow effects as direct children of the fixed container (not inside the transform)

### Architecture (simplified)

```text
+--fixed inset-0 z-60 bg-black--(fullscreen container)--+
|                                                         |
|  +--SafeZoneImage (overflow-hidden)--+                  |
|  |  <img style="transform:scale translate" />           |
|  +---------------------------------------------------+  |
|                                                         |
|  +--absolute inset-0 (UI overlay, NO transform)------+  |
|  |  [Left Button]              [Right Button]         |  |
|  |              [Result Icon]                         |  |
|  |  [Red edge glow]          [Blue edge glow]         |  |
|  +---------------------------------------------------+  |
+----------------------------------------------------------+
```

### Key Details
- Non-fullscreen mode remains unchanged (simple `object-fit: contain`, overlays as children)
- The zoom math in `SafeZoneImage` is correct and untouched
- Only the DOM structure changes: overlays move outside the transformed container
- Mobile result icons use `h-10 w-10` / `text-lg` instead of `h-16 w-16` / `text-xl`
- Touch zones cover the actual viewport dimensions, not the scaled image dimensions

