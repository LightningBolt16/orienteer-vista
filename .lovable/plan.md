

## Route Navigator — Five Changes

### 1. Add Route Navigator to header navigation

Add a "Route Navigator" link in both desktop nav and mobile menu in `Header.tsx`, using the `Navigation` icon from lucide-react (already imported in RouteNavigator page). Place it after Route Finder in both mobile and desktop sections.

**File**: `src/components/Header.tsx`

---

### 2. Fix back button on Route Navigator start screen

The back button on the map selector screen (`RouteNavigator.tsx` line 90) calls `navigate('/')`. This should navigate back properly. The issue is that the `ArrowLeft` button uses `navigate('/')` which always goes home rather than browser back. Change to `navigate(-1)` for proper back behavior.

**File**: `src/pages/RouteNavigator.tsx`

---

### 3. Mobile warning popup on Route Finder

When a mobile user opens Route Finder, show a dialog/alert explaining this game mode works best on a larger screen and suggesting Route Navigator as a mobile-friendly alternative. Two buttons: "Play Anyway" (dismisses) and "Go to Route Navigator" (navigates to `/route-navigator`).

Use `useIsMobile()` hook (already imported in RouteFinder.tsx) and a `useState` to show the dialog on mount for mobile users. Use a standard AlertDialog component.

**File**: `src/pages/RouteFinder.tsx`

---

### 4. Fix admin delete for route navigator maps

The error "Failed to delete navigator challenges" occurs because the RLS `DELETE` policy on `route_navigator_challenges` checks `route_navigator_maps.user_id = auth.uid()`, but admin-uploaded maps have `user_id = NULL`. The `ALL` admin policy should cover this, but the delete-specific policy's `USING` clause may be evaluated first with a false result.

**Fix**: The admin ALL policy uses `has_role(auth.uid(), 'admin')` which should work. The likely issue is that `route_navigator_attempts` has no DELETE policy at all — looking at the RLS policies, there is no DELETE policy on `route_navigator_attempts`. The admin can't delete attempts, so the `.delete()` call on attempts fails silently or blocks.

**Solution**: Add a DELETE policy for admins on `route_navigator_attempts`, and also on `route_finder_attempts` for consistency.

**DB migration**:
```sql
CREATE POLICY "Admins can delete navigator attempts"
ON public.route_navigator_attempts FOR DELETE
TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete finder attempts"  
ON public.route_finder_attempts FOR DELETE
TO public USING (has_role(auth.uid(), 'admin'::app_role));
```

**File**: DB migration

---

### 5. Change scoring to route length ratio

Currently scoring shows `correctHits / totalCorrectNodes` (node-based accuracy). Change to compare the total length of the player's traversed path vs the optimal correct path length.

**Changes**:
- In `RouteNavigatorGame.tsx`: compute `correctRouteLength` (sum of segments in `correctPath`) and `playerRouteLength` (sum of segments in `traversedPath`) when finishing. Pass both to `NavigatorResult`.
- In `NavigatorResult.tsx`: replace accuracy with a length ratio display. Show "Your route: X.Xkm" / "Optimal: X.Xkm" and a percentage score (optimal/yours * 100, capped at 100%).
- The `computeOptimalLength` utility already exists in `routeNavigatorUtils.ts` — but we can simply sum the polyline segment lengths of `correctPath` and `traversedPath` directly in the game component for simplicity.

**Files**: `src/components/route-navigator/RouteNavigatorGame.tsx`, `src/components/route-navigator/NavigatorResult.tsx`

---

### Implementation order
1. Header nav link (trivial)
2. Back button fix (trivial)
3. Mobile warning popup (small)
4. Admin delete RLS fix (migration)
5. Scoring overhaul (medium)

