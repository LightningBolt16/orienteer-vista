
# Route Finder Gamemode - Implementation Plan

## Status: ✅ Phase 1 Complete

Frontend components and database schema implemented. Ready for Modal processor integration.

---

## What's Implemented

### Database Tables (✅ Complete)
- `route_finder_maps` - Maps available for Route Finder gamemode
- `route_finder_challenges` - Individual challenges with graph data
- `route_finder_attempts` - User attempts for scoring

### Frontend Components (✅ Complete)
- `src/utils/routeFinderUtils.ts` - Graph pathfinding & scoring
- `src/components/route-finder/RouteDrawingCanvas.tsx` - Freehand drawing
- `src/components/route-finder/RouteFinderGame.tsx` - Game logic
- `src/components/route-finder/RouteFinderResult.tsx` - Result display
- `src/pages/RouteFinder.tsx` - Game page with map selection

### Edge Functions (✅ Complete)
- Webhook endpoints for `rf-upload-image` and `rf-complete`
- `trigger-route-finder-processing` edge function

### Routing (✅ Complete)
- `/route-finder` route added to App.tsx

---

## What's Needed Next

### Modal Processor Script
Create `docs/modal-processor-route-finder.py` with:

1. **Graph Export Format:**
```json
{
  "nodes": [{"id": "n_0", "x": 1234, "y": 567}, ...],
  "edges": [{"from": "n_0", "to": "n_1", "weight": 15.2}, ...],
  "start": "n_0",
  "finish": "n_42",
  "optimalPath": ["n_0", "n_5", "n_12", "n_42"],
  "optimalLength": 1847.5
}
```

2. **Processing Flow:**
   - Load color/BW maps
   - Apply impassable annotations
   - Generate skeleton graph
   - Simplify to 500-1500 nodes per challenge
   - Select routes with 800-2500px distance
   - For each challenge:
     - Compute optimal path via A*
     - Generate base image (clean map + start/finish markers)
     - Generate answer image (map + optimal route overlay)
     - Upload via `/rf-upload-image`
   - Complete via `/rf-complete` with all graph data

3. **Webhook Calls:**
```python
# Upload each image
POST /rf-upload-image
{
  "map_id": "...",
  "storage_path": "user_id/map_id/base_0.webp",
  "image_data": "<base64>",
  "content_type": "image/webp"
}

# Complete processing
POST /rf-complete
{
  "map_id": "...",
  "map_name": "...",
  "user_id": "...",
  "challenges": [
    {
      "graph_data": {...},
      "start_node_id": "n_0",
      "finish_node_id": "n_42",
      "optimal_path": ["n_0", ...],
      "optimal_length": 1847.5,
      "base_image_path": "user_id/map_id/base_0.webp",
      "answer_image_path": "user_id/map_id/answer_0.webp",
      "aspect_ratio": "1:1"
    }
  ]
}
```

---

## Scoring Logic

Binary scoring (correct/wrong):
- User's freehand drawing is sampled at 15px intervals
- Each sample point snapped to nearest graph node
- Path reconstructed through A* between consecutive nodes
- Correct if user path matches ≥85% of optimal path nodes with ≤25% deviation

---

## Files Created

| File | Purpose |
|------|---------|
| `src/utils/routeFinderUtils.ts` | Graph pathfinding, snapping, scoring |
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Freehand drawing canvas |
| `src/components/route-finder/RouteFinderGame.tsx` | Game logic component |
| `src/components/route-finder/RouteFinderResult.tsx` | Result display |
| `src/pages/RouteFinder.tsx` | Game page |
| `supabase/functions/trigger-route-finder-processing/index.ts` | Trigger function |

## Files Modified

| File | Changes |
|------|---------|
| `src/App.tsx` | Added /route-finder route |
| `supabase/functions/map-processing-webhook/index.ts` | Added RF endpoints |
| `supabase/config.toml` | Added trigger function config |
