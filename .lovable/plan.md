
## Fix plan: source-map storage, editor loading, and correct full-map fallback

### What is actually broken
1. `AdminMapCard.tsx` still uploads large color/B&W files to the `route-images` bucket, so the “file too large” path is still in play for source maps.
2. `PublicMapEditWizard.tsx` still treats `impassability_image_url` as the edit source and only does a `HEAD` check. That does not solve:
   - broken/missing URLs from failed uploads
   - raw TIFF files that browsers cannot render directly
3. The annotation/ROI steps still fall back to `route_images.image_path` too easily, so users see a route crop instead of the real full map.
4. Official maps do not reliably carry their own full source assets, so public editing depends too much on `source_map_id` and route-image fallbacks.

## Implementation approach

### 1) Stop storing full source maps in `route-images`
Use R2 for full-size source assets, same as the private upload flow.

#### Changes
- Add source-key fields on `route_maps`:
  - `color_r2_key`
  - `bw_r2_key`
- Keep:
  - `color_image_url` = browser-friendly preview URL for editor background
  - `impassability_image_url` = browser-friendly preview URL for B&W painting

#### Why
- R2 is already the project’s source-file path for big map files
- avoids storage bucket size issues for official-map source files
- gives one consistent source for cloning and reprocessing

### 2) Update admin uploads to follow the same source-file pattern
Replace the current `supabase.storage.from('route-images').upload(...)` logic in `AdminMapCard.tsx`.

#### New behavior
- Color/B&W full source files upload to R2 via the existing presigned flow pattern
- Save the returned R2 keys into `route_maps.color_r2_key` / `route_maps.bw_r2_key`
- For editor display:
  - if the uploaded file is PNG/JPG/WebP, store its preview URL directly
  - if it is TIFF, generate/upload a browser-friendly preview image and store that URL in `color_image_url` / `impassability_image_url`

#### Result
- no more large-file dependency on `route-images`
- official maps get both:
  - a real source asset for cloning/processing
  - a display asset for the browser editor

### 3) Make the public editor resolve the real map asset first
Refactor `PublicMapEditWizard.tsx` so it resolves assets from the full-map source chain, not from route crops.

#### New resolution order for color background
1. `route_maps.color_image_url`
2. `route_maps.color_r2_key` resolved into a displayable preview
3. linked `user_maps.r2_color_key` via `source_map_id`
4. only then `route_images.image_path` as a legacy fallback

#### New resolution order for B&W edit image
1. `route_maps.impassability_image_url`
2. `route_maps.bw_r2_key` resolved into a displayable preview
3. linked `user_maps.r2_bw_key` via `source_map_id`
4. otherwise disable paint step for that map with a clear message

#### Important code change
Remove the current `HEAD`-only validation step. Replace it with an actual asset resolver that:
- fetches the asset if needed
- converts TIFF to a browser-safe preview when needed
- returns either a real display URL or a specific error

### 4) Reuse the same TIFF conversion logic as the original upload flow
The project already has `convertTifToDataUrl` in `src/utils/tifUtils.ts`.

#### Plan
Add a small helper used by the public editor:
- fetch remote R2 file as `Blob`
- wrap as `File`
- pass to `convertTifToDataUrl`
- feed the resulting data URL into:
  - `ImpassabilityPaintCanvas`
  - `ImpassableDrawingCanvas`
  - `ROIDrawingCanvas`

#### Why
This matches the “same way as first upload” requirement and avoids relying on the browser to natively decode TIFF from a remote URL.

### 5) Make public clones independent of route-image fallbacks
Update `clone-public-map` to prefer route-map-level source keys.

#### New clone logic
- If `route_maps.color_r2_key` / `bw_r2_key` exist, clone from those
- Else fall back to `source_map_id -> user_maps`
- Only allow annotation/ROI-only clone mode for legacy maps with no source assets at all

#### Why
Official maps and user-published maps should stay editable even if the UI never needs to inspect `route_images`.

### 6) Ensure newly processed/published maps always carry their source assets
Update `map-processing-webhook` when it creates `route_maps` from `user_maps`.

#### Copy through
- `r2_color_key -> route_maps.color_r2_key`
- `r2_bw_key -> route_maps.bw_r2_key`

That way private maps already uploaded through the normal user flow remain clonable/editable after they are made public.

### 7) Backfill existing maps
Add a migration to backfill legacy `route_maps` from linked `user_maps` where possible.

#### Migration scope
- add `color_r2_key`, `bw_r2_key`
- populate from `route_maps.source_map_id -> user_maps.r2_color_key/r2_bw_key`

This will immediately improve many existing public maps without manual re-upload.

## Files to change
- `src/components/admin/AdminMapCard.tsx`
- `src/components/user-maps/PublicMapEditWizard.tsx`
- `src/components/user-maps/ImpassabilityPaintCanvas.tsx`
- `src/utils/r2Upload.ts` or a new small single-file R2 helper
- `supabase/functions/clone-public-map/index.ts`
- `supabase/functions/map-processing-webhook/index.ts`
- new migration for `route_maps.color_r2_key` / `bw_r2_key` + backfill

## Technical notes
- Keep `route-images` for route crops and optional preview PNGs, not full source maps
- Do not use raw TIFF URLs directly in the editor when a conversion step is needed
- Route-image fallback should become legacy-only, not the normal path
- This fixes both current symptoms:
  - large color uploads failing
  - impassability edit failing to load
- It also fixes the architectural issue: public maps will carry proper editable source assets instead of depending on cropped route images

## Recommended implementation order
1. Migration: add/backfill `color_r2_key`, `bw_r2_key`
2. `map-processing-webhook`: persist source keys onto `route_maps`
3. `AdminMapCard`: move source uploads to R2 and keep preview URLs separate
4. `PublicMapEditWizard`: asset resolver + remove `HEAD` check
5. `clone-public-map`: clone from route-map-level source keys first
