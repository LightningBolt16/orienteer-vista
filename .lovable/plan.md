

## Three Fixes: Cancel Cleanup + B&W Paint Loading + Admin Color Map Upload

### Problem 1: Cancel leaves orphaned "processing" clone
When the user clicks "Start Editing" on a public map, the wizard immediately calls `clone-public-map` which creates a `user_maps` record with `status: 'pending'`. If the user then cancels, that record remains — showing as a "processing" map in their list.

**Fix**: In `PublicMapEditWizard.tsx`, update `onCancel` to delete the cloned `user_maps` record if one was created but never submitted. Add a cleanup function that runs when the user cancels or navigates back to step 'select' from a later step.

```
onCancel → if clonedMapId exists && !isSubmitted → DELETE from user_maps where id = clonedMapId → then call parent onCancel
```

Also update `handleBack` so going back from step 1 (to cancel) triggers the same cleanup.

### Problem 2: B&W impassability paint canvas loads forever
The `ImpassabilityPaintCanvas` already has `img.crossOrigin = 'anonymous'` (line 44), so the CORS fix is in place. The likely issue is that the `impassability_image_url` stored in `route_maps` may be pointing to a URL that requires different CORS headers, or the image simply fails to load silently.

**Fix**: Add an `img.onerror` handler in `ImpassabilityPaintCanvas.tsx` that sets a loading error state and shows a message instead of spinning forever. Also ensure the URL is valid before attempting to load.

### Problem 3: Admin needs to upload color map for official maps
Currently there's no way to upload a full color map image for official `route_maps`. The color preview in the edit wizard falls back to a small route image crop, which is inadequate.

**Fix**: Add a `color_image_url` column to `route_maps` via migration. Add a "Color" upload button in `AdminMapCard.tsx` (next to the existing B&W button) that uploads a full color PNG/JPG to the `route-images` bucket and stores the public URL. Update `PublicMapEditWizard.tsx` to prefer `color_image_url` over the R2/route-image fallback chain.

### Technical details

**Migration**:
```sql
ALTER TABLE public.route_maps ADD COLUMN IF NOT EXISTS color_image_url text;
```

**Files to modify**:
- `src/components/user-maps/PublicMapEditWizard.tsx` — cleanup on cancel, use `color_image_url` for preview
- `src/components/user-maps/ImpassabilityPaintCanvas.tsx` — add onerror handler
- `src/components/admin/AdminMapCard.tsx` — add color map upload button
- `supabase/functions/clone-public-map/index.ts` — remove dead code after line 184
- New migration for `color_image_url`

### Implementation order
1. Migration: add `color_image_url` to `route_maps`
2. Cancel cleanup in PublicMapEditWizard
3. ImpassabilityPaintCanvas error handling
4. Admin color map upload button
5. Use `color_image_url` in preview fallback chain

