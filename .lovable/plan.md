
Goal

Make public/official map editing use the real full source assets again for:
- Edit Impassability
- Add Boundaries
- Draw ROI

and never rely on route export images as an editor source.

What is actually going wrong

1. The editor currently depends on browser-safe preview URLs, not the original source files.
- `PublicMapEditWizard` can only render `color_image_url` / `impassability_image_url`.
- It cannot render raw `r2_*_key` values.
- `clone-public-map` often returns `has_impassability: true` but `impassability_image_url: null`.

2. Source files exist, but the browser usually cannot use them directly.
- User/public maps keep raw source keys in R2.
- Official maps may also keep raw source keys.
- Direct browser TIFF loading is unreliable, and private/R2 source access is not browser-safe for this flow.

3. Preview generation is happening in the wrong place.
- Admin upload and user upload still try to generate previews in the browser with `convertTifToDataUrl`.
- That is exactly the fragile path that already fails for some TIFFs.
- So the system stores raw source keys successfully, but often fails to store usable editor previews.

4. The current UI and backend disagree about “available”.
- Selection page treats color availability mostly as `color_image_url OR route_images fallback`.
- B&W status is partly inferred from raw keys.
- Wizard paint step still needs an actual browser-loadable B&W image URL.
- Result: maps are shown as partly available even though the B&W editor cannot render.

5. Route-image fallback is the wrong architecture for this feature.
- It can help old color-only maps display something.
- But it is not the original full source map.
- It cannot be the long-term basis for public/official editing.

Root cause

The public editor was changed to require browser-safe full-map preview assets, but preview creation and propagation were never made server-side and reliable.

Current broken chain:
```text
source TIFF exists
-> raw key saved
-> client tries to generate preview PNG
-> preview generation often fails or never runs
-> route/public map is still published
-> editor receives has source / has key
-> but receives no browser-loadable full-map preview
-> B&W editor disappears or cannot render
```

Solid solution direction

Use a two-asset model for every editable public/official map:
1. processing source asset = original TIFF/raw file
2. editor preview asset = full-map browser-safe PNG/WebP generated from the source on the backend

The editor must only use the editor preview asset.
Processing must only use the original source asset.

Implementation plan

1. Introduce a real “editor assets” contract
- Treat these as required editor inputs:
  - full color editor preview
  - full B&W editor preview
- Stop treating raw `r2_color_key` / `r2_bw_key` as UI-ready.
- Add a single resolved status model such as:
  - `ready_full`
  - `ready_color_only`
  - `source_present_preview_missing`
  - `unavailable`

2. Move preview generation fully to the backend
- Add a backend function/job that generates full-map browser-safe previews from original source files.
- It should support:
  - user-uploaded maps from R2 keys
  - official maps from admin-uploaded source keys
  - existing legacy maps that only have source keys
- This replaces browser-side TIFF preview generation as the source of truth.

3. Fix admin upload flow
- Admin color/B&W uploads should:
  - save raw source to storage first
  - trigger backend preview generation
  - update `route_maps.color_image_url` / `route_maps.impassability_image_url` only after backend generation succeeds
- If preview generation fails:
  - keep the source key
  - mark preview status as missing/failed
  - do not show the map as editable

4. Fix user upload flow
- `UserMapUploadWizard` should stop being responsible for reliable preview generation in the browser.
- After source upload and DB insert, trigger backend preview generation.
- Save preview URLs back to `user_maps`.
- Publishing should only expose full editing capability when those preview URLs exist.

5. Fix public map cloning and asset resolution
- `clone-public-map` should resolve and return a strict asset object:
  - source keys present?
  - color editor preview URL
  - B&W editor preview URL
  - editor readiness status
- It should not claim B&W editing is available unless a real B&W editor preview URL exists.
- If previews are missing but source keys exist, return a “preview missing” state instead of pretending it is ready.

6. Refactor `PublicMapEditWizard`
- Make the wizard depend on resolved asset readiness, not on scattered booleans.
- Behavior:
  - full previews available -> show paint + annotations + ROI
  - only color preview available -> allow annotations + ROI only
  - source exists but preview missing -> show explicit unavailable/repair message, no false editing
  - no assets -> unavailable
- Remove route-image fallback from the core public editing path for official/public maps.

7. Fix map selection truthfulness
- On the select screen, show statuses based on full-map editor previews only.
- Replace optimistic labels with truthful ones:
  - “Full editing available”
  - “Color editing only”
  - “Source exists but preview missing”
  - “Not editable”
- Disable start for maps that do not have the required full preview assets.

8. Backfill and repair old data
- Add a repair path for existing maps:
  - for `user_maps` with `r2_*_key` but missing preview URLs, generate previews and save them
  - for `route_maps` linked to those user maps, propagate the preview URLs
  - for official maps with raw source keys but no previews, generate previews directly from source keys
- This is a data backfill plus asset regeneration task, not just a UI fix.

9. Add explicit observability
- Store preview generation state/errors so the app can explain why a map is not editable.
- Log whether failure is:
  - missing source
  - unsupported source format
  - preview generation failed
  - propagation failed
- This prevents future “it says available but doesn’t work” regressions.

Files likely involved

Frontend
- `src/components/user-maps/PublicMapEditWizard.tsx`
- `src/components/user-maps/UserMapUploadWizard.tsx`
- `src/components/user-maps/PublishMapDialog.tsx`
- `src/components/admin/AdminMapCard.tsx`

Backend
- `supabase/functions/clone-public-map/index.ts`
- `supabase/functions/map-processing-webhook/index.ts`
- likely a new backend function for preview generation/regeneration

Database/data work
- possibly add preview status/error fields
- backfill existing `user_maps` and `route_maps` preview URLs from source assets
- regenerate missing preview assets for legacy maps

Recommended order

1. Define editor asset contract and truthful statuses
2. Add backend preview generation for full source maps
3. Update admin/user upload flows to use backend preview generation
4. Refactor clone + wizard to use strict readiness states
5. Fix selection-page availability labels/gating
6. Backfill existing public/official maps
7. Verify official maps, newly uploaded user maps, and published community maps separately

Success criteria

- Public/official maps only show “editable” when full source-based preview assets exist
- B&W paint step appears whenever a real B&W editor preview exists
- No public editing flow depends on route export images
- Newly uploaded/published maps automatically get usable editor assets
- Legacy maps can be repaired through preview regeneration instead of manual guesswork
