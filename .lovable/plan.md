

## Three Fixes: Public Map Editing Access + Admin B&W Upload + Canvas Loading

### Problem
1. Only maps with `source_map_id` appear in the public map editor — official maps without a linked `user_maps` record are excluded
2. Admins have no way to upload B&W impassability images for official maps
3. The "Add Boundaries" and "Draw ROI" canvases load forever because `crossOrigin` is missing on image elements

### Fix 1: Allow all public maps to be cloned

**File**: `src/components/user-maps/PublicMapEditWizard.tsx`

- Remove the `.not('source_map_id', 'is', null)` filter when loading public maps — show ALL public `route_maps`
- Update `clone-public-map` edge function to handle maps without a `source_map_id` — instead of requiring a linked `user_maps` record, create a minimal `user_maps` record using the map's first route image as the color reference
- For maps without source files, skip the clone step entirely and just create a fresh `user_maps` record with annotations/ROI only (no B&W paint step)

**File**: `supabase/functions/clone-public-map/index.ts`

- If `source_map_id` is null, create a `user_maps` record with placeholder paths and store the `source_public_map_id`
- The user can still add annotations and ROI, which get sent to processing

### Fix 2: Admin B&W image upload

**File**: `src/components/admin/AdminMapCard.tsx`

- Add a new upload button (visible only for `route_maps` table) that lets admins upload a B&W PNG
- Upload to the public `maps` storage bucket (or `route-images`) and update `impassability_image_url` on the `route_maps` record
- Show a small indicator when a map already has an impassability image

### Fix 3: Canvas `crossOrigin` fix

**Files**: `src/components/user-maps/ImpassableDrawingCanvas.tsx`, `src/components/user-maps/ROIDrawingCanvas.tsx`

- Add `img.crossOrigin = 'anonymous'` before setting `img.src` in the image loading `useEffect` — matching the pattern already used in `ImpassabilityPaintCanvas.tsx`
- This allows the canvases to draw cross-origin images from Supabase storage

### Fix 4: Better color preview URL

**File**: `src/components/user-maps/PublicMapEditWizard.tsx`

- Instead of using a cropped route image as the color preview (which is a small crop, not the full map), use the map's source image directly if available
- For maps stored in R2, construct the public URL from the R2 color key
- Fallback to the route image approach if no direct source is available

### Technical details

- The `impassability_image_url` column already exists on `route_maps` (added in previous migration)
- Storage bucket `maps` is public, suitable for B&W PNG uploads
- The `crossOrigin` fix is a one-line change per file
- The clone edge function needs a conditional path for maps without `source_map_id`

### Implementation order
1. Canvas `crossOrigin` fix (2 files, 1 line each)
2. Admin B&W upload button in AdminMapCard
3. Remove `source_map_id` filter + update clone function
4. Improve color preview URL logic

