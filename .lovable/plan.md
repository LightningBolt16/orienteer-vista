

## Public Map Impassability Editor — Plan

### Problem
Users want to improve public maps by editing their B&W impassability raster (paint/erase black pixels) and adding boundary annotations. This requires a new editing mode on the My Maps page that clones a public map into a private version, lets the user paint on the B&W image, then triggers reprocessing.

### Architecture

**Two capabilities, different prerequisites:**
1. **B&W paint/erase** — only available when the public map has a linked `user_maps` record with a `bw_tif_path` (you'd upload these for official maps). The user paints on a rasterized preview of the B&W TIF.
2. **Boundary annotations** — available for any public map. Uses the existing `ImpassableDrawingCanvas` polygon/line tools on the color map image. Creates a cloned `user_maps` record with the annotations.

Both produce a cloned private `user_maps` entry owned by the current user, which then gets reprocessed through Modal.

### Data flow

```text
User picks public route_map → 
  Clone user_maps record (new ID, user's user_id) →
  Copy R2 files to user's namespace (via edge function) →
  User edits B&W raster / adds annotations →
  Upload modified B&W back to R2 →
  Trigger reprocessing →
  New private route_maps/route_finder_maps created
```

### Database changes

1. **Add `impassability_image_url` column to `route_maps`** — stores a public URL to a pre-rendered PNG of the B&W TIF for maps where you've uploaded one. This avoids needing to download/convert the TIF client-side.

2. **Add `source_public_map_id` to `user_maps`** — tracks which public map was cloned, preventing duplicate clones and enabling future syncing.

### New components

1. **`PublicMapEditor`** — new page/modal accessible from My Maps. Shows a list of public maps with an "Edit" button. For maps with impassability data, shows the B&W raster painting canvas. For all maps, shows the annotation overlay tools.

2. **`ImpassabilityPaintCanvas`** — new canvas component for painting/erasing on a B&W raster image. Tools: brush (add black), eraser (remove black), brush size slider, pan, zoom. Outputs a modified PNG/bitmap that gets uploaded back as the new B&W image.

3. **Edge function `clone-public-map`** — copies R2 files from the source map's namespace to the user's namespace, creates a new `user_maps` record, and returns the new map ID.

### UI on My Maps page

- Add a new tab or button: "Edit Public Map" alongside "Upload Map"
- Shows a grid/list of public `route_maps` that have `source_map_id` pointing to a `user_maps` with B&W data (for paint mode), plus all public maps (for annotation-only mode)
- Clicking "Edit" opens a wizard:
  1. **Step 1**: Preview the color map + B&W overlay
  2. **Step 2**: Paint/erase on B&W (if available) OR add boundary annotations
  3. **Step 3**: Draw/adjust ROI
  4. **Step 4**: Configure processing parameters
  5. **Step 5**: Submit → clones files, creates user_maps record, triggers processing

### ImpassabilityPaintCanvas details

- Renders the B&W PNG on a canvas with zoom/pan (reuse patterns from `ImpassableDrawingCanvas`)
- Brush tool: draws black circles on canvas at click/drag positions
- Eraser tool: draws white circles (removes impassability)
- Brush size slider (5px–50px in image space)
- On submit: export canvas to PNG blob, upload to R2 replacing the cloned B&W file
- The canvas works in image-coordinate space so the output matches the original TIF dimensions

### Implementation order

1. DB migration: add `impassability_image_url` to `route_maps`, add `source_public_map_id` to `user_maps`
2. Edge function `clone-public-map`: copies R2 files, creates `user_maps` record
3. `ImpassabilityPaintCanvas` component (new)
4. `PublicMapEditWizard` component combining paint canvas + existing annotation/ROI tools
5. Integration into `UserMaps.tsx` page with "Edit Public Map" flow
6. Upload the pre-rendered B&W PNGs for existing public maps (manual/admin step)

### Key considerations

- The B&W TIF files are large; we render a pre-converted PNG for the editor and only upload the modified version back as a PNG (Modal can handle PNG input alongside TIF)
- Modal processor may need a small update to accept PNG for B&W input instead of TIF — or we convert PNG→TIF client/server-side before processing
- ROI from the original map can be pre-filled as a starting point

