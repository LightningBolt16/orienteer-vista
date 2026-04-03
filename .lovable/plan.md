

## Fix File Upload Size Limits, B&W Image Loading, and Storage Accessibility

### Problems identified

1. **Color map upload fails ("file too large")**: The admin uploads color/B&W images to the `route-images` bucket, which has no `file_size_limit` set (Supabase defaults to ~50MB). Large orienteering map images easily exceed this.

2. **B&W impassability image fails to load in paint canvas**: The `ImpassabilityPaintCanvas` already has `crossOrigin = 'anonymous'` and `onerror` handling. The console shows `Failed to load image`. The likely cause: the `impassability_image_url` stored in `route_maps` points to the `route-images` bucket, but the URL may have CORS issues or the image genuinely failed to upload properly (related to problem 1). Once the upload size issue is fixed and a valid image is uploaded, this should resolve.

3. **Private `user-map-sources` bucket blocks cloning**: When user maps are uploaded via the private upload wizard, their TIF files go to the private `user-map-sources` bucket. If these maps are later made public, the source files are inaccessible for cloning. The R2 storage path works (R2 keys are public), but Supabase-stored maps would fail.

### Fix 1: Increase `route-images` bucket file size limit

**Migration**: Set `file_size_limit` on the `route-images` bucket to 500MB (matching `user-map-sources`), since admin-uploaded color maps and B&W images can be very large TIFs/PNGs.

```sql
UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE id = 'route-images';
```

### Fix 2: Add RLS policy for admin uploads to `route-images`

Currently admins upload to `route-images` via `supabase.storage.from('route-images').upload()`. Need to verify storage RLS allows this. Add admin insert/update policies on `storage.objects` for the `route-images` bucket if missing.

### Fix 3: Ensure public map source files are accessible

For the `user-map-sources` bucket (private), when a map's associated `route_maps` entry is public, the clone edge function uses the **service role key** (it already does — line 23 of `clone-public-map/index.ts`), so it can read from private buckets. The clone function doesn't actually copy files from storage — it copies the R2 keys/paths. So this works for R2-stored maps.

For Supabase-stored maps being made public, the `clone-public-map` function just copies the path references (not actual files). The processing pipeline will use the service role to access them. No change needed here.

### Fix 4: Validate the B&W image URL is reachable

In `PublicMapEditWizard.tsx`, add a pre-check that tries to fetch the `impassability_image_url` with a HEAD request before passing it to the paint canvas. If it fails, show an error message instead of loading the canvas.

### Files to modify

1. **New migration** — increase `route-images` bucket limit + ensure storage RLS policies for admin uploads
2. **`src/components/user-maps/PublicMapEditWizard.tsx`** — add URL validation before loading paint canvas
3. **`src/components/admin/AdminMapCard.tsx`** — add file size validation with clear error message before upload attempt (warn if >500MB)

### Implementation order
1. Migration: bucket size limit + storage RLS
2. Admin upload: client-side size validation with helpful error
3. Wizard: B&W URL pre-validation

