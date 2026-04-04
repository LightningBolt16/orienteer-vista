
Goal

Make the public editor use the original uploaded source map assets again for:
- Edit Impassability
- Add Boundaries
- Draw ROI

and only fall back to route crops for truly legacy maps with no source assets at all.

What is actually broken

1. The public editor is trying to read `user_maps.r2_color_key` / `user_maps.r2_bw_key` directly from the client using `source_map_id`.
   - That fails for public maps uploaded by other users because `user_maps` is private by RLS.
   - Result: the editor cannot reach the original source assets even though they exist.

2. The paint step has no terminal “failed/no source” state.
   - If B&W resolution returns `null`, the wizard keeps showing “Resolving B&W image...” forever.

3. The color fallback chain is too permissive.
   - If source lookup fails, it falls back to `route_images.image_path`, which is just a route crop.
   - That is why Add Boundaries sometimes shows a route image instead of the original map.

4. Official maps are a separate case.
   - They need route-level source assets on `route_maps` because there is often no linked private `user_maps` record to fall back to.

Plan

1. Stop client-side reads from `user_maps` in `PublicMapEditWizard`
- Remove the direct client queries using `selectedMap.source_map_id`.
- Replace them with a backend-resolved asset payload fetched through a backend function or by extending `clone-public-map` to return:
  - resolved source references for color and B&W
  - whether B&W editing is actually available
  - any initial ROI/annotation data if needed
- This avoids the current RLS problem entirely.

2. Make the editor use original uploaded assets first
- For color steps, use this order:
  1. `route_maps.color_image_url`
  2. `route_maps.color_r2_key`
  3. source private map R2 key resolved server-side
  4. only then legacy route crop, and only if no real source exists
- For B&W steps, use this order:
  1. `route_maps.impassability_image_url`
  2. `route_maps.bw_r2_key`
  3. source private map B&W R2 key resolved server-side
  4. otherwise mark B&W editing unavailable
- Keep using the TIFF conversion path from `tifUtils`/`r2Preview` so uploaded TIFFs render the same way as in the original upload flow.

3. Remove the misleading route-image fallback for editable maps
- If a map is supposed to have a real source asset but it cannot be resolved, show an error state instead of silently using a route crop.
- Only use `route_images.image_path` for old legacy maps that truly have no source color asset anywhere.
- This prevents the “pointless route image” behavior in Add Boundaries and ROI.

4. Fix the infinite loading states
- Track explicit asset states in the wizard, e.g. `loading | ready | unavailable | error`.
- For Edit Impassability:
  - if no B&W source exists, skip the step or show “This map has no editable B&W source”
  - if load fails, show a real error card instead of spinning forever
- Do the same for Add Boundaries and ROI so they never sit in an endless loader.

5. Ensure newly public user maps always carry their source assets on `route_maps`
- Keep `map-processing-webhook` copying `r2_color_key` and `r2_bw_key` from `user_maps` into `route_maps`.
- Verify published maps rely on those route-level fields first, so public editing does not depend on private-table reads.
- Backfill any existing `route_maps` from linked `user_maps` so older public maps start working again.

6. Keep official maps editable through route-level assets
- Official maps should continue storing their full source assets directly on `route_maps` (`color_r2_key`, `bw_r2_key`, optional preview URLs).
- Admin upload should remain the path for official maps without original private-source linkage.

Technical details

- Main root cause is not Modal; it is that the frontend is trying to read private source-map rows directly.
- The safest fix is: resolve source assets server-side, then let the frontend only consume public/edit-safe asset references.
- The editor should never treat `null` as “still loading”.
- Route crops should be legacy fallback only, not the normal editor source.

Files likely involved

- `src/components/user-maps/PublicMapEditWizard.tsx`
- `src/utils/r2Preview.ts`
- `supabase/functions/clone-public-map/index.ts` or a new backend function for editor asset lookup
- `supabase/functions/map-processing-webhook/index.ts`
- one migration/backfill for older `route_maps` that are missing `color_r2_key` / `bw_r2_key`

Recommended order

1. Fix wizard state handling so it cannot spin forever
2. Move source asset lookup off the client and behind backend resolution
3. Remove route-crop fallback except for true legacy cases
4. Backfill older public maps from linked private source maps
5. Verify official maps still use route-level uploads correctly
