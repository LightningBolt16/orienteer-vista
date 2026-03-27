## Route Navigator — Data Format Fix + UX Improvements

### 1. Two-file upload format

The current uploader expects a single JSON with `decision_points` embedded per challenge. The new pipeline produces two separate files:

- `**decision_points.json**` — full graph of all nodes for the map. Each node has `id`, `x`, `y` (and `r`/`c` aliases), and `branches` with `to_macro` and `path`. No `is_correct` flags.
- `**challenges_routing.json**` — array of challenges, each with `start`, `finish`, `bbox`, and `correct_node_sequence` (array of node IDs representing the optimal path).

**Merge logic at import time:**

1. Parse `decision_points.json` into a lookup map by node ID.
2. For each challenge in `challenges_routing.json`:
  - Get the `correct_node_sequence` array.
  - For each consecutive pair `(nodeA, nodeB)` in the sequence, find `nodeA` in the graph. On `nodeA`, find the branch where `to_macro === nodeB.id` and mark it `is_correct = true`. All other branches on that node get `is_correct = false`.
  - Only include nodes that appear in or are reachable from the correct sequence (or include all nodes within the challenge bbox for wrong-turn exploration).
  - Convert `r`/`c` path coordinates to `x`/`y` format.
3. Store the merged result as `decision_points` JSON in the DB, same schema as today.

**Uploader UI changes:**

- Two file inputs: "Decision Points JSON" and "Challenges Routing JSON"
- Validation: show how many challenges parsed, how many nodes in graph, any challenges with missing nodes

### 2. Re-import Matera

- Delete existing Matera challenges from DB
- Re-import using the new two-file merge logic
- This will be done via the updated uploader (or a one-time migration)

### 3. Gameplay UX improvements

**a) Start button instead of auto-start**

- Replace the 3-second auto-timer with a "Start" button overlay during overview phase
- Track `viewStartTime` from when overview becomes visible
- When user clicks Start, record `previewDuration = now - viewStartTime` (store in attempt record later)
- The map stays in overview (contain-fit) until the user clicks Start
- Zoom in on start/finish in overview, not fully zoomed in but so that it is easier to see the correct map region

**b) Zoom-out button**

- Add a toggle button (e.g., magnifying glass icon) in the HUD during navigation
- When pressed, temporarily switch to overview camera (contain-fit, no rotation) so the player can see the full map
- Tap again or tap a branch to return to zoomed navigation view
- While zoomed out, branch selection is still active

**c) Tighter zoom on decision points**

- Reduce `zoomRadius` from 350 to ~250, bringing the camera closer to junctions
- Keep the min/max scale clamps to prevent extreme zoom

**d) IOF standard start/finish markers**

- Color: `#f20dff` (magenta/purple, matching route finder)
- **Start**: equilateral triangle, oriented so one vertex points toward the finish. Unfilled, purple stroke.
- **Finish**: double circle (outer + inner), unfilled, purple stroke.
- **Connecting line**: straight dashed line from start to finish with a small gap near each marker (like route finder does).
- Show these markers during both overview AND navigation phases.
- During navigation, the markers should be visible in the SVG world layer so they rotate/scale with the camera.

### Files to change


| File                             | Changes                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `RouteNavigatorUploadWizard.tsx` | Two file inputs, merge logic, r/c→x/y conversion                        |
| `RouteNavigatorGame.tsx`         | Start button, zoom-out toggle state, viewTime tracking                  |
| `NavigatorMapView.tsx`           | IOF markers, zoom-out mode, tighter zoomRadius, start/finish during nav |
| `routeNavigatorUtils.ts`         | Path coordinate normalization helper                                    |


### Technical notes

- **r/c → x/y conversion**: The `decision_points.json` uses `r` (row=y) and `c` (col=x) in branch paths. The merge step will convert `{r, c}` → `{x: c, y: r}`.
- **Node filtering per challenge**: For each challenge, include ALL graph nodes (not just the correct sequence) so wrong turns still have visible branches. The `is_correct` flag on each branch at each node determines the correct path.
- **Start triangle rotation**: Calculate angle from start to finish using `Math.atan2(finish.y - start.y, finish.x - start.x)`, rotate the triangle SVG by that angle so a vertex points toward finish.