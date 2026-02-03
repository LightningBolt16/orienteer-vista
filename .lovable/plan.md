# Plan: Separate Route Choice and Route Finder Processing Scripts

## ✅ COMPLETED

This plan has been fully implemented.

## Problem Summary (Resolved)

When uploading a map for **Route Finder**, the processing was triggering **Route Choice** logic, resulting in:
1. Being redirected to Route Game instead of Route Finder
2. "No Routes Available" error in Route Finder

## Solution Implemented

Created completely separate Modal scripts for Route Choice and Route Finder, each with their own independent endpoints.

---

## Implementation Complete

### 1. ✅ Clean Route Choice Script Created
- File: `docs/modal-processor-route-choice.py`
- App name: `map-processor`
- Contains ONLY Route Choice logic (no Route Finder code)
- Uses existing `MODAL_ENDPOINT_URL` secret

### 2. ✅ Standalone Route Finder Script Created
- File: `docs/modal-processor-route-finder.py`
- App name: `route-finder-processor`
- Fixed pickling issue: uses single-threaded loop instead of `ProcessPoolExecutor`
- Added version logging for deployment verification
- Includes detailed progress logging

### 3. ✅ Edge Function Updated
- File: `supabase/functions/trigger-route-finder-processing/index.ts`
- Now uses `MODAL_ROUTE_FINDER_ENDPOINT_URL` (separate from Route Choice)
- Added version logging for debugging

### 4. ✅ Secret Added
- `MODAL_ROUTE_FINDER_ENDPOINT_URL` - points to the Route Finder Modal deployment

---

## Deployment Steps Required

1. **Deploy Route Choice script**:
   ```bash
   modal deploy docs/modal-processor-route-choice.py
   ```
   - Keep using existing `MODAL_ENDPOINT_URL` for this

2. **Deploy Route Finder script**:
   ```bash
   modal deploy docs/modal-processor-route-finder.py
   ```
   - Copy the new endpoint URL from Modal dashboard

3. **Update the secret** `MODAL_ROUTE_FINDER_ENDPOINT_URL` with the Route Finder endpoint URL from step 2

4. Edge functions are automatically redeployed

5. **Test** by uploading a map with "Route Finder" mode selected

---

## Technical Details

### Route Choice Processing Flow
```
User uploads map → trigger-map-processing → MODAL_ENDPOINT_URL → map-processor app
                                                                  ↓
                                        webhook/complete → route_maps + route_images tables
```

### Route Finder Processing Flow
```
User uploads map → trigger-route-finder-processing → MODAL_ROUTE_FINDER_ENDPOINT_URL → route-finder-processor app
                                                                                        ↓
                                        webhook/rf-complete → route_finder_maps + route_finder_challenges tables
```

### Key Fix: Pickling Issue

The original error was:
```
AttributeError: Can't pickle local object 'process_route_finder_mode.<locals>.eval_route_pair'
```

Fixed by replacing `ProcessPoolExecutor` with a simple single-threaded loop:
```python
valid_routes = []
for pair in pairs:
    st, en = pair
    try:
        path = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
        path_length = nx.path_weight(Gs, path, weight="weight")
        if MIN_ROUTE_LENGTH <= path_length <= MAX_ROUTE_LENGTH:
            valid_routes.append({"start": st, "end": en, "path": path, "length": path_length})
    except nx.NetworkXNoPath:
        pass
```

This is efficient enough for the ~10,000 route pairs being evaluated.
