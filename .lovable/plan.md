

# Fix Route Finder Submit and Leaderboard Issues

## Problem Summary

Two distinct issues are preventing proper Route Finder gameplay and leaderboard updates:

1. **Submit button crashes**: When submitting a drawn route, the game crashes with "Cannot read properties of undefined (reading '0')". This happens because the `graph_data` stored in the database doesn't contain the `optimalPath` property - it's stored in a separate `optimal_path` column.

2. **Leaderboard not updating for Route Finder**: The leaderboard only queries the `route_attempts` table (Route Choice), completely ignoring `route_finder_attempts` (Route Finder). Route Finder stats are never reflected in rankings.

---

## Root Cause Analysis

### Issue 1: Graph Data Structure Mismatch

The database stores challenges like this:
- `graph_data`: Contains `{ nodes: [...], edges: [...] }` (no optimalPath)
- `optimal_path`: Separate column with the path array
- `start_node_id`, `finish_node_id`: Separate columns

But `RouteFinderGame.tsx` transforms the data at lines 72-77:
```typescript
const transformedChallenges = data.map((c: any) => ({
  ...c,
  graph_data: c.graph_data as RouteFinderGraph,  // Missing optimalPath!
  optimal_path: c.optimal_path as string[],
}));
```

The `graph_data` gets cast to `RouteFinderGraph` which expects `optimalPath`, but it's never added. When `scoreDrawing()` calls `isPathOptimal(userPath, graph.optimalPath)`, `graph.optimalPath` is undefined.

**Fix**: Merge the separate columns into the graph object properly:
```typescript
const transformedChallenges = data.map((c: any) => ({
  ...c,
  graph_data: {
    ...c.graph_data,
    start: c.start_node_id,
    finish: c.finish_node_id,
    optimalPath: c.optimal_path,
    optimalLength: c.optimal_length,
  } as RouteFinderGraph,
}));
```

### Issue 2: Separate Leaderboards for Different Games

Route Choice and Route Finder are different game modes with different attempt tables:
- Route Choice: `route_attempts` table → updates `user_profiles` stats
- Route Finder: `route_finder_attempts` table → no leaderboard

Currently, Route Finder gameplay saves to `route_finder_attempts` but the leaderboard only queries `user_profiles` which is only updated from `route_attempts`.

**Options**:
1. **Separate leaderboards**: Create a Route Finder-specific leaderboard

---

## Implementation Steps

### Step 1: Fix Graph Data Transformation in RouteFinderGame.tsx

Modify the data transformation to properly merge separate columns into the `graph_data` object:

**File**: `src/components/route-finder/RouteFinderGame.tsx`

**Change** (around lines 72-77):
```typescript
const transformedChallenges = data.map((c: any) => ({
  ...c,
  map_name: c.route_finder_maps?.name,
  graph_data: {
    nodes: c.graph_data.nodes || [],
    edges: c.graph_data.edges || [],
    start: c.start_node_id,
    finish: c.finish_node_id,
    optimalPath: c.optimal_path || [],
    optimalLength: c.optimal_length || 0,
  } as RouteFinderGraph,
}));
```

### Step 2: Update Route Finder Stats to User Profiles

Create a leaderboard for Route Finder sepearete from the Route Choice Leaderboards

### Step 3: Add Defensive Checks in routeFinderUtils.ts

Add null checks to prevent crashes if data is malformed:

**File**: `src/utils/routeFinderUtils.ts`

**Change** `isPathOptimal` function:
```typescript
export function isPathOptimal(
  userPath: string[],
  optimalPath: string[]
): boolean {
  // Defensive checks
  if (!userPath || !optimalPath) return false;
  if (userPath.length < 2 || optimalPath.length < 2) return false;
  
  // ... rest of function
}
```

**Change** `scoreDrawing` function:
```typescript
export function scoreDrawing(
  userPoints: Point[],
  graph: RouteFinderGraph
): { ... } {
  // Validate graph data
  if (!graph || !graph.nodes || !graph.optimalPath) {
    console.error('Invalid graph data for scoring');
    return {
      isCorrect: false,
      snappedPath: [],
      userPathLength: 0,
      optimalLength: 0,
    };
  }
  // ... rest of function
}
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/route-finder/RouteFinderGame.tsx` | Fix graph data transformation, add route_attempts insert |
| `src/utils/routeFinderUtils.ts` | Add defensive null checks |

### Database Tables Involved

- `route_finder_challenges`: Source of challenge data (already correct)
- `route_finder_attempts`: Route Finder-specific tracking (keep as-is)
- `route_attempts`: Main attempts table for leaderboard (add Route Finder entries with `RF:` prefix)
- `user_profiles`: Stores accuracy/speed stats (updated via `updatePerformance`)

### Testing Plan

1. **Submit button fix**: Play Route Finder, draw a route, click Submit - should show result without crashing
2. **Leaderboard update**: Complete several Route Finder challenges, check that accuracy/speed in profile updates
3. **Both games work**: Verify Route Choice still works correctly after changes

