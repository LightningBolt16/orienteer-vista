

## Route Navigator — Four Fixes

### 1. First-use tutorial + per-challenge instructions

**First use**: Similar to the existing `RouteGameTutorial` pattern, create a `RouteNavigatorTutorial` component shown once per user (track via a new `navigator_tutorial_seen` boolean on `user_profiles`). Content explains: you'll see a map overview, then zoom into decision points, pick directions with arrows, goal is to find the shortest route from start to finish.

**Per-challenge brief**: On the overview phase (before clicking "Start"), show a small instruction banner: "Study the map, then tap Start. Choose directions at each junction to find the shortest route." This replaces the current bare "Start" button with a more informative overlay. After the first tutorial is dismissed, only this brief banner appears.

**DB migration**: `ALTER TABLE public.user_profiles ADD COLUMN navigator_tutorial_seen boolean NOT NULL DEFAULT false;`

**Files**:
- New `src/components/route-navigator/NavigatorTutorial.tsx`
- Edit `RouteNavigatorGame.tsx` — integrate tutorial check and brief instructions overlay
- DB migration for the new column

---

### 2. Remove white inner core from arrows

In `NavigatorMapView.tsx`, the branch arrow rendering has three layers: shadow, colored stroke, and white inner core (`ARROW_CORE`). The arrowhead also has an inner white polygon.

**Changes in `NavigatorMapView.tsx`**:
- Delete the `ARROW_CORE` constant
- Remove the third `<path>` element (lines ~259-267, the white core stroke)
- Remove the inner `<polygon>` (lines ~282-287, the white inner arrowhead)
- Slightly increase the main stroke width to compensate (e.g. 7→8 for normal, 9→10 for selected)

---

### 3. Fix path rendering through impassable areas

Currently both the correct path and traversed path are drawn as straight lines between node centers. Since nodes can be far apart, these lines cut through buildings, fences, and other impassable areas.

**Fix**: Instead of straight node-to-node lines, use the actual `branch.path` coordinates stored in the decision point data. Each branch already has a `path` array of intermediate pixel coordinates that follows the actual road/trail network.

**Changes in `RouteNavigatorGame.tsx`**:
- `correctPath` computation: instead of pushing only `{ x: cur.x, y: cur.y }`, also push all intermediate points from `correctBranch.path` between nodes
- `traversedPath` recording in `handleBranchSelect`: instead of pushing only the next node position, push the full `branch.path` array points
- This ensures both paths follow roads on the map

**Changes in `NavigatorMapView.tsx`**: No changes needed — the polyline rendering already handles arbitrary point arrays.

---

### 4. Fix admin delete for route navigator maps

The delete logic in `AdminMapCard.tsx` (line 142-143) correctly deletes `route_navigator_challenges` then the map. However, `route_navigator_attempts` has a `challenge_id` column that likely references challenges. When challenges are deleted, attempts with those challenge_ids may cause issues (the column is nullable with no FK, so this shouldn't block).

The actual issue: the RLS policy on `route_navigator_challenges` for delete only allows users who own the map (`route_navigator_maps.user_id = auth.uid()`). Admin maps typically have `user_id = NULL` (set during admin upload). The `ALL` policy should cover admins, but the delete-specific policy's `USING` clause checks `user_id = auth.uid()` which fails for NULL user_id rows. Since both policies are permissive, the ALL policy should suffice — but if the admin ALL policy isn't matching, the issue is likely that the `handleDelete` function silently fails on challenges and then the map delete fails.

**Fix in `AdminMapCard.tsx`**:
- Add error checking on the challenge delete step — if it fails, log and show the error
- Also delete `route_navigator_attempts` referencing those challenges before deleting challenges
- Add `await` error handling for each step and abort on failure

**Fix in DB** (if needed): Verify the admin ALL policy is working. May need to also delete attempts:
```sql
DELETE FROM route_navigator_attempts WHERE challenge_id IN (SELECT id FROM route_navigator_challenges WHERE map_id = '<map_id>');
```

Add this cleanup step in `handleDelete` before deleting challenges.

---

### Implementation order
1. Arrow white core removal (smallest, independent)
2. Admin delete fix (small, independent)
3. Path rendering fix (medium, uses existing data)
4. Tutorial (largest, new component + migration)

