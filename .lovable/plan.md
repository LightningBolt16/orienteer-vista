

# Route Finder Path Alignment and Impassability Fix

## Summary

The Route Finder game has two main issues:
1. **Path snapping is inaccurate** - User drawings don't snap correctly to the skeleton graph
2. **Routes can cross impassable (black) areas** - Both user drawings and the "correct" route sometimes traverse areas that should be blocked

This plan addresses both issues through server-side and client-side improvements.

---

## Problem Analysis

### Issue 1: Graph Coordinate Mismatch

The node coordinates in the database (e.g., `x:1432, y:651`) appear to still be quite large. While the Modal processor has a `bbox` offset transformation (lines 88-96), there may be inconsistencies between how coordinates are transformed during processing versus how they're used client-side.

**Current flow:**
```text
+-----------------------+        +----------------------+        +--------------------+
| Modal Processor       | -----> | Database             | -----> | Frontend Canvas    |
| Generates graph in    |        | Stores graph_data    |        | Draws paths using  |
| challenge-image space |        | with node coords     |        | scaled coordinates |
+-----------------------+        +----------------------+        +--------------------+
```

The issue is that the scaling calculation in `RouteDrawingCanvas.tsx` and `RouteFinderResult.tsx` uses `imageDimensions` (natural image size) divided by container size, but the graph coordinates may not perfectly align with this.

### Issue 2: No Impassability Enforcement

Currently:
- Users can draw anywhere on the map, including over black (impassable) areas
- The snapping algorithm finds the **nearest** node regardless of whether the path crosses impassable terrain
- The skeleton graph is built from white areas, but simplified/corridor-limited nodes may still allow connections that "jump" over black areas

---

## Solution Architecture

### Part 1: Load and Use Impassability Data (Client-Side)

Store the B&W map or a mask alongside each challenge so the client can:
1. **Prevent drawing on black areas** - Show visual feedback when user tries to draw on impassable terrain
2. **Validate snapped paths** - Reject snapped paths that cross impassable areas

### Part 2: Improve Graph Generation (Server-Side)

Update the Modal processor to:
1. **Store impassability mask** - Generate and upload a downscaled binary mask for each challenge
2. **Ensure edges don't cross black** - Verify all graph edges only traverse white pixels

### Part 3: Client-Side Drawing Validation

Update the drawing canvas to:
1. **Load the impassability mask** for each challenge
2. **Block drawing on black areas** - Either prevent strokes or show warning
3. **Validate user path against mask** before snapping

---

## Implementation Steps

### Step 1: Database Schema Update

Add a new column to store the impassability mask path:

```sql
ALTER TABLE route_finder_challenges 
ADD COLUMN impassability_mask_path TEXT;
```

### Step 2: Update Modal Processor

Modify `docs/modal-processor-route-finder.py` to:

1. **Generate a downscaled binary mask** (1/4 resolution) for each challenge bbox
2. **Upload the mask** as a PNG alongside base/answer images
3. **Include mask path** in challenge data

```python
# After creating the challenge images
def generate_impassability_mask(bw_crop, bbox, folder, challenge_index):
    """Generate a downscaled binary mask for the challenge area."""
    mask_region = bw_crop.crop(bbox)
    # Downscale 4x for efficient client loading
    small_w = (bbox[2] - bbox[0]) // 4
    small_h = (bbox[3] - bbox[1]) // 4
    mask_small = mask_region.resize((small_w, small_h), Image.NEAREST)
    # Convert to pure black/white
    mask_binary = mask_small.point(lambda x: 255 if x > 128 else 0)
    mask_path = f"/tmp/rf_{folder}/challenge_{challenge_index}_mask.png"
    mask_binary.save(mask_path, "PNG")
    return mask_path
```

### Step 3: Update Webhook Handler

Modify `supabase/functions/map-processing-webhook/index.ts` to:
- Handle `impassability_mask_path` in rf-complete webhook
- Upload the mask image alongside other images

### Step 4: Update Frontend - RouteFinderGame

Modify `src/components/route-finder/RouteFinderGame.tsx` to:
- Load the impassability mask when loading a challenge
- Pass the mask to `RouteDrawingCanvas`

### Step 5: Update Frontend - RouteDrawingCanvas

Modify `src/components/route-finder/RouteDrawingCanvas.tsx` to:

1. **Load and cache the mask image**
2. **Check drawing points against mask** - Prevent drawing on black areas
3. **Provide visual feedback** - Flash red or show indicator when user tries to draw on impassable area

```typescript
// New function to check if a point is on passable terrain
const isPassable = (x: number, y: number): boolean => {
  if (!maskData) return true;
  const scaledX = Math.floor(x / maskScale);
  const scaledY = Math.floor(y / maskScale);
  const idx = (scaledY * maskWidth + scaledX) * 4;
  // White (passable) has high red value
  return maskData[idx] > 128;
};
```

### Step 6: Update Snapping Logic

Modify `src/utils/routeFinderUtils.ts` to:

1. **Accept optional mask data** in `snapPointsToGraph`
2. **Filter out nodes on impassable terrain** during snapping
3. **Validate reconstructed path** doesn't cross black areas

```typescript
// Enhanced snapping with impassability check
export function snapPointsToGraphWithMask(
  userPoints: Point[],
  graph: RouteFinderGraph,
  checkPassable?: (x: number, y: number) => boolean
): string[] {
  // Filter nodes to only those on passable terrain
  const passableNodes = checkPassable 
    ? graph.nodes.filter(n => checkPassable(n.x, n.y))
    : graph.nodes;
  
  // ... rest of snapping logic
}
```

### Step 7: Validate Optimal Path Display

Ensure the "correct" green route is actually correct by:
1. Verifying the optimal path coordinates align with the challenge image
2. Using the same coordinate scaling for both user path and optimal path rendering

---

## Technical Details

### Coordinate System Verification

The Modal processor transforms coordinates like this:
```python
offset_row = bbox[1] if bbox else 0  # top
offset_col = bbox[0] if bbox else 0  # left
nodes_json = [
    {
        "id": node_id_map[node], 
        "x": int(node[1] - offset_col),  # col -> x
        "y": int(node[0] - offset_row)   # row -> y
    }
    for node in node_list
]
```

The frontend scales like this:
```typescript
const scaleX = imageDimensions.width / containerRect.width;
const scaleY = imageDimensions.height / containerRect.height;
// Drawing: ctx.lineTo(coords.x / scaleX, coords.y / scaleY)
```

**Issue:** The `imageDimensions` comes from the loaded WEBP which may have slightly different dimensions than the bbox due to matplotlib's `tight_layout`. This can cause subtle alignment drift.

**Fix:** Store the exact bbox dimensions in the database and use those for scaling instead of relying on the natural image dimensions.

### Mask Resolution Trade-off

- Full resolution masks would be too large to load quickly
- 1/4 resolution (25%) provides good accuracy while keeping files small (~50KB per mask)
- Could also use 1-bit PNG for even smaller files (~10KB)

---

## Files to Modify

| File | Changes |
|------|---------|
| `docs/modal-processor-route-finder.py` | Add mask generation and upload |
| `supabase/functions/map-processing-webhook/index.ts` | Handle mask path in rf-complete |
| `src/components/route-finder/RouteFinderGame.tsx` | Load mask, pass to canvas |
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Validate drawing against mask |
| `src/utils/routeFinderUtils.ts` | Add mask-aware snapping functions |
| `src/components/route-finder/RouteFinderResult.tsx` | Ensure correct coordinate scaling |

---

## Migration Path

1. **Deploy updated Modal processor** manually via `modal deploy`
2. **Deploy updated webhook** (automatic with Lovable)
3. **Run database migration** to add new column
4. **Reprocess existing maps** to generate masks
5. **Deploy frontend changes** (automatic with Lovable)

---

## Alternative: Simpler Approach

If full mask integration is too complex, a simpler first step:

1. **Store bbox dimensions** in the database alongside graph data
2. **Use exact bbox for scaling** instead of image natural dimensions
3. **Improve snapping threshold** - reject snaps that are too far from the drawing

This would fix the coordinate alignment without requiring mask downloads.

---

## Recommendation

Start with the **simpler approach** to fix coordinate alignment first, then add mask-based validation if needed. The core issue appears to be coordinate scaling mismatch, which can be fixed without adding impassability masks.

