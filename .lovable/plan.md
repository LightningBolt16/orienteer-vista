

## Route Navigator — Updated Plan with Data Structures

### Data Format (from Matera pipeline)

Each challenge in `Matera_challenges_routing.json` contains:

```text
{
  "challenge_id": 1,
  "start": { "x": 1723, "y": 2970 },           // pixel coords on source map
  "finish": { "x": 3024, "y": 3119 },
  "bbox": { "min_x": 1523, "max_x": 3353, "min_y": 2385, "max_y": 3320 },
  "optimal_path": [ {x, y}, {x, y}, ... ],      // pixel-by-pixel (STRIP THIS)
  "decision_points": [                           // nodes relevant to THIS challenge
    {
      "id": 149,
      "x": 2833.67, "y": 2001.67,               // pixel coords on source map
      "branches": [
        {
          "to_macro": 680,                        // destination node id
          "path": [ {x,y}, ... ],                 // trail pixels between junctions
          "is_correct": true                      // on the optimal path?
        },
        { "to_macro": 315, "path": [...], "is_correct": false }
      ]
    },
    ...
  ]
}
```

The full `decision_points.json` (807 nodes, whole map graph) is NOT needed for gameplay — each challenge already embeds only the relevant subset of nodes with `is_correct` flags.

### Storage Strategy

**Strip `optimal_path`** (pixel-by-pixel path, thousands of points per challenge — unnecessary for turn-by-turn gameplay). Keep only `decision_points`, `start`, `finish`, `bbox`, `challenge_id`.

Store **one row per challenge** in a new `route_navigator_challenges` table, matching the existing `route_finder_challenges` pattern.

### Database

**New table: `route_navigator_maps`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Map name |
| user_id | uuid | Owner |
| source_image_url | text | Full-res source map in storage |
| image_width | integer | Source image pixel width |
| image_height | integer | Source image pixel height |
| map_category | text | official / private / community |
| is_public | boolean | |
| is_hidden | boolean | |
| country_code | text | |
| created_at | timestamptz | |

RLS: same pattern as `route_finder_maps`.

**New table: `route_navigator_challenges`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| map_id | uuid | FK to route_navigator_maps |
| challenge_index | integer | From pipeline challenge_id |
| start_x | numeric | Pixel coord on source map |
| start_y | numeric | |
| finish_x | numeric | |
| finish_y | numeric | |
| bbox | jsonb | `{min_x, max_x, min_y, max_y}` |
| decision_points | jsonb | Array of nodes with branches + is_correct |
| optimal_length | numeric | Computed from path or provided by pipeline |
| difficulty_score | numeric | Optional |
| created_at | timestamptz | |

RLS: same pattern as `route_finder_challenges` (anyone can view if map is public, owners can delete).

**New table: `route_navigator_attempts`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| challenge_id | uuid | |
| map_name | text | Denormalized for leaderboard |
| player_path | jsonb | Sequence of node ids chosen |
| is_optimal | boolean | Did they follow the correct path? |
| wrong_turns | integer | Count of wrong branches taken |
| response_time | integer | Total ms |
| created_at | timestamptz | |

### Upload Flow (Admin)

An admin upload wizard (or a parser script) that:
1. Accepts the `{MapName}_challenges_routing.json` file
2. Strips `optimal_path` from each challenge
3. Computes `optimal_length` by summing Euclidean distances between consecutive `decision_points` on the correct branch path (or accepts it from pipeline)
4. Inserts one row per challenge into `route_navigator_challenges`
5. The source map image is uploaded to `user-route-images` bucket

### Game Flow

```text
1. Map selector → pick a Route Navigator map
2. OVERVIEW (2-3s): Full map shown, start ● and finish ★ marked
3. ZOOM IN: Animate to first decision point (start node)
   - Map rotated so finish direction is UP
   - Zoom to ~400px radius around junction
4. DECIDE: Player sees branch trails highlighted, taps one or uses arrows
   - If correct: animate along branch path to next node, recalculate rotation
   - If wrong: immediate feedback (flash red), count wrong turn, show correct
5. REPEAT until reaching finish node
6. RESULT: Score based on wrong turns + time
```

### Core Components

| New File | Purpose |
|----------|---------|
| `src/pages/RouteNavigator.tsx` | Page with map selector, fullscreen toggle |
| `src/components/route-navigator/RouteNavigatorGame.tsx` | State machine: overview → navigating → result |
| `src/components/route-navigator/NavigatorMapView.tsx` | Map image with CSS transform (scale, translate, rotate) |
| `src/components/route-navigator/JunctionOverlay.tsx` | Branch arrows + trail highlights overlay |
| `src/components/route-navigator/NavigatorResult.tsx` | Results screen |
| `src/utils/routeNavigatorUtils.ts` | Bearing calc, scoring |

### Transform Logic

At each junction node, compute bearing to finish and zoom level:

```typescript
// Bearing from current node to finish (in degrees, 0 = up)
const bearing = Math.atan2(finish.x - current.x, -(finish.y - current.y)) * (180 / Math.PI);

// CSS transform on the map image container
transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${-bearing}deg)`;
transformOrigin: `${current.x}px ${current.y}px`;
```

The overlay layer (arrows/buttons) is OUTSIDE the transform, positioned in screen coordinates.

### Branch Visualization

Each branch's `path` array provides ~5-20 pixel-coord points from the junction outward. Render the first ~100px of each branch as a colored SVG polyline on the transformed map. Make them tappable (fat stroke + invisible hit area). Alternatively, show directional arrow buttons outside the transform for mobile.

### Scoring

- **Perfect run**: 0 wrong turns = 100 points
- **Penalty per wrong turn**: -10 points (minimum 0)
- **Time bonus**: Multiplier based on speed (fast decisions = higher score)
- `score = max(0, 100 - wrongTurns * 10) * timeMultiplier`

### Routing

Add `/route-navigator` to `App.tsx`. Add navigation button from landing/index page.

### Implementation Phases

1. **Database**: Create 3 tables + RLS policies via migration
2. **Upload**: Admin upload wizard that parses the JSON, strips optimal_path, inserts challenges
3. **Game core**: Map view with zoom/pan/rotate, junction detection, branch selection
4. **Results + scoring**: Score calculation, attempt recording, results screen
5. **Polish**: Animations, mobile optimization, landing page integration

### Technical Details

- **Decision point ordering**: The `decision_points` array per challenge contains only nodes on or near the optimal path. The game starts at the node closest to `start` coords and navigates toward `finish`. At each node, find which branch has `is_correct: true` — that's the optimal choice.
- **Path between junctions**: Each branch has a `path` array of pixel coords. Use these for the pan animation between nodes (interpolate along the path over ~600ms).
- **Rotation animation**: CSS `transition: transform 0.6s ease-in-out` handles smooth rotation + pan between junctions.
- **Mobile tap targets**: Arrow buttons should be 48px+ for touch. Position them around the screen edges, outside the rotating map container.

