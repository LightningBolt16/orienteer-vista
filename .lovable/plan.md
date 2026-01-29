
# Route Finder Gamemode - Implementation Plan

## Overview

A new gamemode where users draw their route freehand on a clean map (showing only start/finish markers), and the system scores them based on whether their drawn route, when snapped to the terrain graph, matches the optimal shortest path.

---

## Architecture Summary

```text
+------------------+     +-------------------+     +------------------+
|  Modal Processor |---->|  Supabase Storage |---->|  React Frontend  |
|  (route-finder)  |     |  + Database       |     |  (RouteFinderGame)|
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        v                        v                        v
  - Base image (clean)     - route_finder_images    - RouteDrawingCanvas
  - Answer image (route)   - graph_data JSON        - Graph pathfinding
  - Skeleton graph JSON    - route_finder_maps      - Binary scoring
```

---

## Phase 1: Database Schema

### New Tables

**`route_finder_maps`** - Maps available for Route Finder gamemode

```sql
CREATE TABLE route_finder_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  source_map_id UUID REFERENCES user_maps(id),
  is_public BOOLEAN DEFAULT false,
  map_category TEXT DEFAULT 'official',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`route_finder_challenges`** - Individual route challenges with graph data

```sql
CREATE TABLE route_finder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES route_finder_maps(id) ON DELETE CASCADE,
  challenge_index INTEGER NOT NULL,
  
  -- Graph data for client-side pathfinding
  graph_data JSONB NOT NULL,  -- {nodes: [{id, x, y}], edges: [{from, to, weight}]}
  start_node_id TEXT NOT NULL,
  finish_node_id TEXT NOT NULL,
  optimal_path JSONB NOT NULL,  -- [node_id_1, node_id_2, ...]
  optimal_length NUMERIC NOT NULL,
  
  -- Image paths
  base_image_path TEXT NOT NULL,    -- Clean map with start/finish only
  answer_image_path TEXT NOT NULL,  -- Map with optimal route overlayed
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16_9', '9_16', '1:1')),
  
  -- Metadata
  difficulty_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`route_finder_attempts`** - User attempts for scoring/leaderboard

```sql
CREATE TABLE route_finder_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID REFERENCES route_finder_challenges(id),
  map_name TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL,  -- ms
  user_path JSONB,  -- Optional: store user's snapped path for analysis
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies

- Challenges: Public read, admin insert/update/delete
- Attempts: Users can insert/view their own, public read for leaderboard
- Maps: Public read, admin manage

---

## Phase 2: Modal Processor Script

### New File: `docs/modal-processor-route-finder.py`

Key differences from `modal-processor-complete.py`:

1. **Single optimal route per challenge** (no alternate routes needed)
2. **Longer route selection** (800-2500m pixel distance range)
3. **Exports simplified skeleton graph as JSON**
4. **Generates two images per challenge:**
   - Base image: Clean map + start/finish markers only
   - Answer image: Map with optimal route overlayed

### Graph Export Format

```json
{
  "nodes": [
    {"id": "n_0", "x": 1234, "y": 567},
    {"id": "n_1", "x": 1240, "y": 580}
  ],
  "edges": [
    {"from": "n_0", "to": "n_1", "weight": 15.2}
  ],
  "start": "n_0",
  "finish": "n_42",
  "optimal_path": ["n_0", "n_5", "n_12", "n_42"],
  "optimal_length": 1847.5
}
```

### Processing Flow

```python
# Pseudocode for route-finder processor

1. Load color/BW maps (same as existing)
2. Apply impassable annotations (same as existing)
3. Generate skeleton graph (same as existing)
4. Simplify graph to ~500-2000 nodes for frontend efficiency
5. Select route pairs with longer distances (800-2500px)
6. For each challenge:
   a. Compute optimal path using A*
   b. Export simplified graph JSON (nodes near route corridor)
   c. Generate base image (map + start/finish markers, no routes)
   d. Generate answer image (map + optimal route overlay)
   e. Upload via webhook
7. Send completion webhook with graph data
```

### Graph Simplification Strategy

- Keep only nodes within a corridor around the optimal route (300px radius)
- Merge very close nodes (within 10px) to reduce complexity
- Target 500-1500 nodes per challenge for responsive client-side pathfinding

---

## Phase 3: Webhook Updates

### Modify `map-processing-webhook/index.ts`

Add new endpoints for Route Finder:

- `POST /rf-upload-image` - Upload base/answer images
- `POST /rf-complete` - Finalize processing, insert graph data

### New Trigger Edge Function

Create `supabase/functions/trigger-route-finder-processing/index.ts`

Similar to existing trigger, but:
- Targets Route Finder Modal endpoint
- Uses different processing parameters (longer routes, single optimal path)

---

## Phase 4: Frontend Components

### 4.1 Route Drawing Canvas

**New File: `src/components/route-finder/RouteDrawingCanvas.tsx`**

Features:
- Freehand drawing on canvas overlay
- Touch and mouse support
- Undo last segment
- Clear all
- Zoom/pan support for large maps
- Visual feedback for drawing state

```tsx
interface RouteDrawingCanvasProps {
  imageUrl: string;
  onPathComplete: (points: Point[]) => void;
  disabled?: boolean;
}
```

### 4.2 Graph Pathfinding Utility

**New File: `src/utils/routeFinderUtils.ts`**

Functions:
- `snapPointsToGraph(userPoints, graph)` - Snap freehand drawing to graph nodes
- `findShortestPath(graph, start, end)` - A* implementation for user's path
- `comparePaths(userPath, optimalPath)` - Binary comparison (match/no match)
- `pathToNodeIds(snappedPath, graph)` - Convert point sequence to node IDs

```typescript
interface GraphNode {
  id: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

interface RouteFinderGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string;
  finish: string;
  optimalPath: string[];
  optimalLength: number;
}

// Snap user's freehand drawing to nearest graph nodes
function snapPointsToGraph(
  userPoints: Point[], 
  graph: RouteFinderGraph
): string[] {
  // 1. Find nearest node for each user point
  // 2. Remove consecutive duplicates
  // 3. Return sequence of node IDs
}

// Compare user's snapped path to optimal
function isPathOptimal(
  userNodePath: string[], 
  optimalPath: string[]
): boolean {
  // Check if user traversed the same nodes as optimal
  // Allow for minor variations (same edges traversed)
}
```

### 4.3 Route Finder Game Component

**New File: `src/components/route-finder/RouteFinderGame.tsx`**

Game flow:
1. Show base image with start/finish markers
2. User draws their route
3. User taps "Submit" (or auto-submit on reaching finish)
4. System snaps drawing to graph
5. Compare to optimal path
6. Show result (correct/wrong) with answer image overlay
7. Next challenge

### 4.4 Route Finder Page

**New File: `src/pages/RouteFinder.tsx`**

- Map selection (similar to RouteGame)
- Challenge loading from database
- Score tracking
- Tutorial for first-time users

---

## Phase 5: Data Flow

### Loading a Challenge

```typescript
async function loadChallenge(challengeId: string): Promise<Challenge> {
  const { data } = await supabase
    .from('route_finder_challenges')
    .select('*, route_finder_maps(name)')
    .eq('id', challengeId)
    .single();
  
  return {
    baseImageUrl: getStorageUrl(data.base_image_path),
    answerImageUrl: getStorageUrl(data.answer_image_path),
    graph: data.graph_data,
    optimalPath: data.optimal_path,
    mapName: data.route_finder_maps.name,
  };
}
```

### Scoring a Drawing

```typescript
async function scoreDrawing(
  userPoints: Point[], 
  challenge: Challenge
): Promise<{isCorrect: boolean, snappedPath: string[]}> {
  // 1. Snap user's freehand points to graph nodes
  const snappedPath = snapPointsToGraph(userPoints, challenge.graph);
  
  // 2. Find the path the user actually drew (via A* between snapped points)
  const userPath = findUserPath(snappedPath, challenge.graph);
  
  // 3. Compare to optimal path
  const isCorrect = isPathOptimal(userPath, challenge.optimalPath);
  
  return { isCorrect, snappedPath: userPath };
}
```

---

## Phase 6: Mobile Support

- RouteDrawingCanvas uses touch events
- Simpler UI for mobile (larger buttons, clearer touch targets)
- Same aspect ratio logic as Route Choice (16:9 desktop, 9:16 mobile)

---

## Implementation Order

| Step | Task | Dependencies |
|------|------|--------------|
| 1 | Database migration (create tables + RLS) | None |
| 2 | Create Modal processor script (docs/modal-processor-route-finder.py) | Step 1 |
| 3 | Add webhook endpoints for Route Finder | Step 1 |
| 4 | Create trigger edge function | Step 3 |
| 5 | Create routeFinderUtils.ts (graph + pathfinding) | None |
| 6 | Create RouteDrawingCanvas component | None |
| 7 | Create RouteFinderGame component | Steps 5, 6 |
| 8 | Create RouteFinder page + routing | Step 7 |
| 9 | Add admin upload support for Route Finder maps | Steps 1-4 |
| 10 | Testing and iteration | All |

---

## Technical Considerations

### Graph Size Optimization

The simplified graph per challenge should be 500-1500 nodes to ensure:
- Fast loading (JSON ~50-150KB per challenge)
- Responsive client-side A* pathfinding (<50ms)
- Accurate snapping of freehand drawings

### Drawing Snapping Algorithm

1. Sample user's freehand path at regular intervals (every 10-20px)
2. For each sample point, find nearest graph node (KD-tree recommended)
3. Build path by connecting consecutive snapped nodes via shortest graph path
4. Compare resulting node sequence to optimal path

### Binary Scoring Logic

A path is "correct" if:
- The user's snapped path follows the same edges as the optimal path
- Minor variations are allowed (e.g., same route taken but in slightly different order through junction)
- The path must go from start to finish (incomplete paths = wrong)

---

## Files to Create

1. `supabase/migrations/[timestamp]_route_finder_tables.sql` - Database schema
2. `docs/modal-processor-route-finder.py` - Modal processing script
3. `supabase/functions/trigger-route-finder-processing/index.ts` - Trigger function
4. `src/utils/routeFinderUtils.ts` - Graph and pathfinding utilities
5. `src/components/route-finder/RouteDrawingCanvas.tsx` - Drawing component
6. `src/components/route-finder/RouteFinderGame.tsx` - Game logic component
7. `src/pages/RouteFinder.tsx` - Game page

## Files to Modify

1. `supabase/functions/map-processing-webhook/index.ts` - Add RF endpoints
2. `src/App.tsx` - Add route for `/route-finder`
3. `src/components/Header.tsx` - Add navigation link (optional)
4. `supabase/config.toml` - Add new edge function config
