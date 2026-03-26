
## Route Navigator: robust fix plan for Matera

### What I verified
- The Matera navigator map is public and loads 114 challenges plus a valid source image URL.
- In the sandbox, clicking Matera reproduces the failure: brief loading/overview, then a mostly black game area with HUD but unusable map.
- The source image itself does load successfully; the failure is in view/state logic, not missing storage data.
- The current implementation has 4 concrete weak points:
  1. `RouteNavigatorGame` starts the 3-second overview immediately after challenge data loads, before the source image is confirmed loaded.
  2. `NavigatorMapView` uses fragile transform math (`transformOrigin=currentNode` + translate/scale/rotate in one string), which is easy to push fully off-screen.
  3. The map image and SVG overlay are not built as a proper shared “world stage”, so alignment is brittle.
  4. `findStartNode` picks the nearest node only. I checked the Matera data and about 8/114 challenges would start on a node with no correct outgoing branch, so some rounds are inherently wrong/unwinnable with current logic.

### Root causes to fix
1. **Bad phase timing**
   - Overview begins before `imageReady` and before the viewport is stable.
   - On a large source image, the overview can expire while the map is still black/loading.

2. **Bad camera model**
   - The navigation view should be a camera centered on a junction.
   - Right now it is a single CSS transform with implicit ordering, which is why the image can vanish while overlays remain.

3. **Bad graph resolution**
   - “Closest node to start” is not robust enough for this dataset.
   - Completion logic also relies too much on “no next node” instead of “we have reached finish proximity / terminal correct-path node”.

4. **Weak interaction affordance**
   - Branch previews only use `slice(0, 30)`, which is often too short visually.
   - Even if technically clickable, the routes are too subtle for real gameplay.

### Implementation plan

#### 1) Stabilize loading before gameplay
- Add explicit `imageLoaded` state to `NavigatorMapView` / `RouteNavigatorGame`.
- Do not enter the overview timer until all 3 are true:
  - challenge loaded
  - container size measured (`width > 0 && height > 0`)
  - source image loaded
- Until then, show a full-screen loading state on black background, not the game HUD.
- This alone should stop the “squished then disappears” first impression.

#### 2) Rebuild the map as a proper stage + camera
Refactor `NavigatorMapView` into a shared-coordinate world stage:

```text
viewport (absolute, overflow hidden)
└─ camera layer (absolute, transform from world -> screen)
   └─ world layer (position: relative; width=imageWidth; height=imageHeight)
      ├─ image layer
      └─ svg overlay layer
```

Use a deterministic transform like:

```text
translate(viewportCenterX, viewportCenterY)
rotate(-bearing)
scale(zoom)
translate(-currentNode.x, -currentNode.y)
```

Key rules:
- `transformOrigin: 0 0`
- image and overlay must live inside the same world layer
- the world layer must have explicit width/height matching source pixels
- no mixed implicit layout positioning

This is the most important structural fix.

#### 3) Fix overview rendering separately from navigation
- Overview should use simple contain-fit of the full source map with visible start/finish markers.
- Navigation should use the camera model above.
- Do not reuse the navigation transform for overview.
- Keep a persistent “goal compass” during navigation, and keep a faint finish indicator when it is within view.

#### 4) Make challenge start/end resolution robust for Matera data
Replace the current naive helpers with data-aware ones:

- **Start node selection**
  - Prefer the nearest node that has at least one `is_correct=true` outgoing branch.
  - If multiple candidates are close, pick the one whose correct-path chain can progress toward finish.
  - Only fall back to plain nearest node if no such candidate exists.

- **Completion detection**
  - Consider challenge complete when:
    - the next node is within a finish tolerance, or
    - the correct branch leads to the terminal node nearest finish, or
    - the branch endpoint itself is within finish tolerance.
  - Do not rely only on `nextNode.branches.length === 0`.

- **Validation on load**
  - Precompute challenge validity once per loaded map:
    - resolvable start node
    - at least one correct path chain
    - resolvable finish
  - Skip invalid challenges and log them clearly instead of starting broken rounds.

#### 5) Improve route visibility and selection
- Replace `branch.path.slice(0, 30)` with a preview based on cumulative distance, so each option shows enough visible trail.
- Increase visible stroke and hit area.
- Add an optional mobile-friendly fallback choice UI:
  - branch buttons/arrows outside the map
  - still keep direct map tapping as the main interaction
- Keep the current node marker larger and clearer.

#### 6) Prevent black-screen camera states
- Add camera safeguards:
  - clamp zoom to sane min/max
  - if the computed transform would place nearly the entire world outside the viewport, fall back to a safer zoom-out
  - if rotation + zoom near map edge creates too much empty space, reduce zoom slightly rather than showing an almost all-black screen
- This should make the game resilient even when a junction is near map boundaries.

#### 7) Harden the upload/import flow
- Keep import logic compatible with both `decision_points` and `decision_nodes`.
- Add import-time validation summary:
  - total challenges
  - skipped invalid challenges
  - challenges whose nearest node had no correct branch
- Require a valid source image URL/dimensions before the map is considered playable.
- Remove reliance on one-off map-specific cleanup behavior; challenge replacement should happen inside the uploader/admin action, not via hardcoded migration deletes.

### Files that will likely change
- `src/components/route-navigator/NavigatorMapView.tsx`
- `src/components/route-navigator/RouteNavigatorGame.tsx`
- `src/utils/routeNavigatorUtils.ts`
- `src/pages/RouteNavigator.tsx`
- `src/components/admin/RouteNavigatorUploadWizard.tsx`

### Technical details
- The cleanest fix is not more tweaking of the current transform formula; it is replacing it with a proper camera stage.
- The Matera dataset is usable, but the game logic must respect that many nodes are distractors and only some are on the correct chain.
- No major database redesign is required for this fix; this is mainly view logic + challenge validation + importer hardening.

### Acceptance criteria
The fix is done when all of these are true in a logged-out sandbox:
1. Clicking Matera shows a stable loading state, then a readable full-map overview.
2. Start and finish markers are clearly visible during overview.
3. After overview, the map remains visible and centered on the first playable junction.
4. At least the first several Matera challenges are actually playable and progress correctly.
5. Route choices are clearly visible and easy to tap/click.
6. No “marker and routes over black background” state appears.
7. No challenge starts on a dead node with zero correct outgoing branches.
