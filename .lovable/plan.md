

## Diagnosis and Fix Plan

### Issue 1: "Offset is outside the bounds of the data view" on admin upload

**Root cause**: `AdminMapCard.tsx` calls `convertTifToDataUrl(file)` to generate a PNG preview when uploading a BW or color TIFF. The geotiff.js library cannot decode certain TIFF compression formats (e.g. LZW with certain configurations), throwing a DataView bounds error. The upload fails entirely because the error is not caught separately from the R2 upload.

**Fix**: Wrap the preview generation in a try/catch so that R2 upload succeeds even if the browser-side TIFF-to-PNG conversion fails. Show a warning that no preview could be generated but the source file was uploaded. Also accept PNG/JPEG uploads directly (not just TIF) since these don't need conversion.

### Issue 2: Public map editor loads forever / shows "no source"

**Root cause**: Looking at the database, **zero** route_maps have `color_image_url` populated, and only Rinkeby has `impassability_image_url` (pointing to a raw `.tif`). The `clone-public-map` function tries to resolve preview URLs from `route_maps` and linked `user_maps`, but finds nothing because preview URLs were never generated for existing maps.

The wizard's route_images fallback (lines 142-153) should provide a color source from the cropped route images, but this only works after `clone-public-map` returns successfully. If the clone function itself errors or the map has no route_images, the wizard shows "unavailable."

**Fix**:
1. Make the route_images fallback more robust — query it regardless of clone result
2. For the BW step: if no preview URL exists, skip the step gracefully (which the code already does via `hasImpassability`) 
3. For color steps (annotations/ROI): always fall back to route_images crop as the drawing background — this is adequate for boundary drawing and ROI selection

### Issue 3: BW impassability editor "dropped"

**Root cause**: The component (`ImpassabilityPaintCanvas`) still exists and is imported. But the wizard step is only shown when `hasImpassability && bwPreviewUrl` are both truthy (line 268). Since no maps have `bw_preview_url` or `impassability_image_url` populated, the step is always skipped.

**Fix**: 
- When admin uploads a BW file successfully (even if preview generation fails), mark the map as having impassability
- On the clone-public-map side, if a `bw_r2_key` exists on the route_map, generate a flag `has_impassability = true` even without a preview URL
- Actually the real issue is the BW paint canvas needs a displayable URL. The fix in admin upload (Issue 1) must ensure previews are stored. Additionally, for maps that already have BW R2 keys but no preview, provide an admin action to regenerate previews.

### Issue 4: Leaderboard not updating

**Root cause**: The data exists (74 attempts, 3 users with 3+ attempts). The leaderboard query looks correct. The likely issue is the **1000-row default Supabase limit** isn't a problem here. Let me check if the `map_name` filter is causing empty results — the leaderboard filters by `map_name` (a text field) but the tabs use `map.name` from `route_finder_maps`. If the `map_name` stored in attempts doesn't match the map name exactly, the filter returns empty. Also, the leaderboard may simply need a page refresh or the user may be looking at a filtered view.

**Fix**: Add explicit `.limit(10000)` to the attempts query to be safe, and verify that `map_name` values in attempts match the map names from `route_finder_maps`. Also add a refresh button to the inline leaderboard.

---

### Implementation Plan

#### Step 1: Fix admin upload TIFF error
- In `AdminMapCard.tsx`, wrap `convertTifToDataUrl` in try/catch for both `handleBwUpload` and `handleColorUpload`
- If conversion fails, still upload to R2 successfully but show a warning toast that preview couldn't be generated
- Accept PNG/JPEG directly without TIFF conversion (they're already browser-friendly)

#### Step 2: Fix public map editor asset resolution  
- In `PublicMapEditWizard.tsx`, make the route_images fallback always run (not just when clone returns no color URL)
- In `clone-public-map`, set `has_impassability = true` when `bw_r2_key` exists (even without preview URL)
- Ensure the wizard never shows infinite loading — always resolve to `ready` or `unavailable`

#### Step 3: Restore BW paint editor visibility
- When a map has `bw_r2_key` but no `impassability_image_url`, still show the paint step but with a message explaining they need to upload a preview via admin first (for official maps) or that the B&W source is available for processing but not for browser editing
- For user maps with `bw_preview_url` populated (from the upload wizard), the paint step will work normally

#### Step 4: Fix leaderboard data loading
- Add `.limit(10000)` to the attempts query in both `RouteFinderLeaderboard.tsx` and `RouteFinderLeaderboardInline.tsx`
- Verify `map_name` matching between attempts and maps
- The inline leaderboard already has a refresh mechanism via `useEffect` on `selectedMap`

#### Files to modify
- `src/components/admin/AdminMapCard.tsx` — graceful TIFF conversion failure
- `src/components/user-maps/PublicMapEditWizard.tsx` — robust asset resolution, restore paint step
- `supabase/functions/clone-public-map/index.ts` — better has_impassability logic  
- `src/pages/RouteFinderLeaderboard.tsx` — add query limit
- `src/components/route-finder/RouteFinderLeaderboardInline.tsx` — add query limit

