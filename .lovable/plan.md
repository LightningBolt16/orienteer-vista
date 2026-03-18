

## Plan: Fix Play Routes, Mobile Route Length Filter, and Club Maps Leaderboard

### Issue 1: "Play Routes" from My Maps shows "No routes available"

**Root Cause:** When clicking "Play Routes" on the `/my-maps` page, it navigates to `/route-game?map={user_maps.id}`. The `loadUserMapRoutes` function in `routeDataUtils.ts` queries `route_images` filtered by `aspect_ratio = '16_9'` (desktop) or `'9_16'` (mobile). However, newer user maps (like "SOLTEST") only have images in `1:1` aspect ratio. Unlike `fetchRouteDataForMap`, `loadUserMapRoutes` does not check for `1:1` images as a fallback.

**Fix:** Update `loadUserMapRoutes` in `src/utils/routeDataUtils.ts` to first check if `1:1` images exist for the map (same pattern used in `fetchRouteDataForMap`), and if so, query those instead of the requested aspect ratio.

**Files changed:**
- `src/utils/routeDataUtils.ts` -- Add `1:1` fallback logic to `loadUserMapRoutes` (around line 509-514)

---

### Issue 2: Limit routes shown on mobile to under 1500m in length

**What:** On mobile devices, filter out routes where `mainRouteLength >= 1500` to keep the game manageable on smaller screens.

**Where to apply:** In `src/pages/RouteGame.tsx`, after routes are loaded (in the route-loading `useEffect` around line 192-300), apply a filter on mobile. Also apply the same filter in `loadUserMapRoutes` results and in the `playSelectedMaps` function.

**Files changed:**
- `src/pages/RouteGame.tsx` -- After setting `routes`, filter by `mainRouteLength < 1500` when `isMobile` is true. Apply in:
  1. The main route-loading effect (after all category branches resolve routes)
  2. The `loadUserMapRoutes` user-map-mode effect
  3. The `playSelectedMaps` function

---

### Issue 3: Club maps leaderboard on My Club page

**Status:** This is already implemented in `ClubsPage.tsx` (lines 69-476). The "Club Maps" section with expandable per-map leaderboards exists. However, the club maps are fetched by looking up `user_maps` with the club's `club_id`, then finding `route_maps`/`route_finder_maps` by `source_map_id`. This should work if the maps were published correctly.

Let me verify the query is matching club maps by also directly querying `route_maps` and `route_finder_maps` by `club_id` (which is set during the publish-to-club flow) as a fallback/additional source. Currently it only looks at `user_maps.club_id -> source_map_id`, but the publish flow sets `club_id` on `route_maps`/`route_finder_maps` directly.

**Fix:** Update the club maps fetching in `ClubsPage.tsx` `fetchData` to also query `route_maps` and `route_finder_maps` directly by `club_id` (in addition to or instead of the `source_map_id` approach), since that is how publish-to-club stores the association.

**Files changed:**
- `src/pages/ClubsPage.tsx` -- Replace or supplement the club maps query (lines 192-216) to also fetch maps where `club_id = membership.club_id` directly from `route_maps` and `route_finder_maps`

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/utils/routeDataUtils.ts` | Add `1:1` aspect ratio fallback in `loadUserMapRoutes` |
| `src/pages/RouteGame.tsx` | Filter routes by `mainRouteLength < 1500` on mobile |
| `src/pages/ClubsPage.tsx` | Query club maps by `club_id` directly from `route_maps` and `route_finder_maps` |

