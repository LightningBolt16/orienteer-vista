## Fix Route Image Display — COMPLETED

### What was fixed

1. **CSS `aspect-ratio` + `max-height` conflict**: Replaced with explicit pixel dimensions calculated in JS
2. **Container always fills available width**: Instead of shrinking width when height-limited, the zoom region widens to fill the container
3. **Arrow buttons inside image bounds**: Overlays and buttons are now rendered as children of AdaptiveCropImage, inside the correctly-sized container
4. **RouteSelector crash guard**: Added undefined check for `currentRoute`

### Files changed
- `src/components/map/AdaptiveCropImage.tsx` — Unified zoom with explicit pixel dimensions, children prop
- `src/components/RouteSelector.tsx` — Crash guard + children pattern for overlays/arrows
- `src/components/MobileRouteSelector.tsx` — Children pattern for touch zones/arrows/overlays
