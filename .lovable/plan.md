

## Complete Overhaul: Public Map Edit Mode

### Root cause

The `r2Preview.ts` resolver tries to fetch TIFF files directly from the R2 public CDN URL (`pub-d72218e4aec146adb567299c2968aed4.r2.dev`) in the browser. This fails with "Failed to fetch" because the R2 bucket does not serve CORS headers. The browser blocks the cross-origin request entirely.

This means every map that relies on R2 TIFF resolution — which is every map with source assets — shows "no editable B&W source" or loads forever, because the catch clause returns `null` and the wizard marks it `unavailable`.

In the private upload flow this never happens because the user selects TIFFs locally and `convertTifToDataUrl` works on a local `File` object. The TIFFs are uploaded TO R2 but never fetched FROM R2 in the browser.

### Solution: store browser-friendly PNG previews at upload time

Instead of trying to fetch and convert remote TIFFs in the browser, store a PNG preview alongside each TIFF at the point where the user/admin already has the file locally. The editor then uses these preview URLs directly — no cross-origin TIFF fetching needed.

### Changes

#### 1. Private upload flow — generate and store PNG previews

In `UserMapUploadWizard.tsx`, after the user's TIF is converted for preview (line 145, `convertTifToDataUrl`), take that data URL, convert it to a PNG blob, and upload it to the public `route-images` Supabase bucket alongside the TIFF upload to R2.

Store the preview URL on `user_maps` in two new columns: `color_preview_url` and `bw_preview_url`.

Do the same for the B&W TIF — convert it client-side and upload a PNG preview.

#### 2. Admin upload flow — generate and store PNG previews

In `AdminMapCard.tsx`, when the admin uploads a color or B&W file, convert it client-side to a PNG preview (using canvas for images, `convertTifToDataUrl` for TIFFs), upload the preview to `route-images`, and store the URL on `route_maps.color_image_url` / `route_maps.impassability_image_url`.

Currently the admin upload goes to R2 only — add the preview upload to `route-images` as a second step.

#### 3. Webhook — propagate preview URLs to route_maps

In `map-processing-webhook/index.ts`, when creating a `route_maps` entry from a `user_maps` record, also copy over `color_preview_url` and `bw_preview_url` into `route_maps.color_image_url` and `route_maps.impassability_image_url`.

#### 4. Rewrite `r2Preview.ts` — remove remote TIFF fetching

Replace the current `resolveImageUrl` that tries to fetch remote TIFFs with a simple function that only uses stored preview URLs:
- `resolveColorPreview`: check `color_image_url` first, then fall back to route-image crop. No R2 fetch.
- `resolveBwPreview`: check `impassability_image_url` first. If null, return null (no B&W available). No R2 fetch.

Remove `r2KeyToUrl`, `isTiffUrl`, and the TIFF fetch+convert path entirely from this file.

#### 5. Simplify `PublicMapEditWizard.tsx`

- Remove the complex multi-fallback asset resolution useEffect
- Use preview URLs directly from `resolvedAssets` (which come from `clone-public-map`)
- If `impassability_image_url` is null and `color_image_url` is null, show clear "no source available" messages
- Keep the explicit `loading | ready | unavailable | error` states but simplify the resolution logic

#### 6. Update `clone-public-map` edge function

Return the preview URLs directly. Remove any logic that returns R2 keys for client-side resolution — the client no longer needs them. The response should include:
- `color_image_url` (browser-friendly preview)
- `impassability_image_url` (browser-friendly preview)
- `has_impassability` (boolean)
- R2 keys are still stored on the cloned `user_maps` for server-side processing, but not returned for browser display.

#### 7. Migration

Add `color_preview_url` and `bw_preview_url` columns to `user_maps` table.

### For existing maps without previews

Maps that already have R2 keys but no preview URLs will need admin re-upload of the preview images via the admin panel. This is a one-time manual step. The admin upload flow (change 2) will make this straightforward.

### Files to modify

- `src/utils/r2Preview.ts` — simplify to use preview URLs only
- `src/components/user-maps/PublicMapEditWizard.tsx` — simplify asset resolution
- `src/components/user-maps/UserMapUploadWizard.tsx` — add preview PNG upload
- `src/components/admin/AdminMapCard.tsx` — store preview alongside R2 upload
- `supabase/functions/clone-public-map/index.ts` — return preview URLs
- `supabase/functions/map-processing-webhook/index.ts` — propagate preview URLs
- New migration for `user_maps.color_preview_url`, `user_maps.bw_preview_url`

### Implementation order

1. Migration: add preview URL columns to `user_maps`
2. Rewrite `r2Preview.ts` to remove TIFF fetching
3. Simplify `PublicMapEditWizard.tsx` to use preview URLs
4. Update `clone-public-map` to return preview URLs
5. Update `AdminMapCard.tsx` to generate and store previews
6. Update `UserMapUploadWizard.tsx` to generate and store previews
7. Update `map-processing-webhook` to propagate preview URLs

