

# Plan: Separate Route Choice and Route Finder Processing Scripts

## Problem Summary

When uploading a map for **Route Finder**, the processing still triggers the **Route Choice** logic, resulting in:
1. Being redirected to Route Game instead of Route Finder
2. "No Routes Available" error in Route Finder

The root cause is that the unified `modal-processor-complete.py` script has a mode check (`mode == 'route_finder'`), but this isn't properly differentiating the processing because both edge functions call the same Modal endpoint. Additionally, the Route Finder processing might not be completing successfully, causing the system to fall back to Route Choice behavior.

## Solution

Create completely separate Modal scripts for Route Choice and Route Finder, each with their own independent endpoints.

---

## Implementation Steps

### 1. Revert Route Choice Script (Clean Version)

Create a clean `docs/modal-processor-route-choice.py` by removing all Route Finder code from the current complete script:
- Remove the `process_route_finder_mode` function
- Remove the `simplify_graph_for_challenge` function  
- Remove the Route Finder helper globals (`_rf_graph`, etc.)
- Remove the mode check at line 723
- Keep only Route Choice processing logic

### 2. Create Standalone Route Finder Script

Update `docs/modal-processor-route-finder.py` with:
- Fix the pickling issue by using single-threaded processing (currently line 395-399 uses `ProcessPoolExecutor`)
- Add version logging for deployment verification
- Use a different Modal app name: `route-finder-processor`
- Include its own web endpoint that's separate from Route Choice

### 3. Update Edge Function Configuration

#### 3.1 Update `trigger-route-finder-processing` edge function:
- Add a new secret: `MODAL_ROUTE_FINDER_ENDPOINT_URL`
- Use this separate endpoint instead of the shared `MODAL_ENDPOINT_URL`
- Add version logging for debugging

#### 3.2 Keep `trigger-map-processing` unchanged:
- Uses `MODAL_ENDPOINT_URL` for Route Choice only
- No mode parameter needed

### 4. Update Supabase Config

Add the `trigger-route-finder-processing` function config if not already present.

### 5. Add Secret for Route Finder Endpoint

Add a new secret `MODAL_ROUTE_FINDER_ENDPOINT_URL` that points to the Route Finder Modal deployment.

---

## Technical Details

### Route Choice Script (`modal-processor-route-choice.py`)
- **App name**: `map-processor` (existing)
- **Endpoint**: `/process-map` (existing)
- **Webhooks used**: 
  - `/update-status`
  - `/upload-image`
  - `/complete`

### Route Finder Script (`modal-processor-route-finder.py`)
- **App name**: `route-finder-processor`
- **Endpoint**: `/process-route-finder`
- **Webhooks used**:
  - `/update-status`
  - `/rf-upload-image`
  - `/rf-complete`

### Edge Function Changes

```typescript
// trigger-route-finder-processing/index.ts
const VERSION = "route-finder-trigger-v1.0.0";

// Use separate endpoint
const modalEndpoint = Deno.env.get('MODAL_ROUTE_FINDER_ENDPOINT_URL');
```

### Pickling Fix in Route Finder Script

Replace:
```python
with ProcessPoolExecutor() as ex:
    futures = [ex.submit(eval_route_pair, p) for p in pairs]
```

With single-threaded loop:
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

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `docs/modal-processor-route-choice.py` | Create (clean Route Choice only) |
| `docs/modal-processor-route-finder.py` | Update (fix pickling, add version) |
| `supabase/functions/trigger-route-finder-processing/index.ts` | Update (use separate endpoint) |
| `supabase/config.toml` | Update if needed |

---

## Deployment Steps (After Implementation)

1. Deploy Route Choice script:
   ```
   modal deploy docs/modal-processor-route-choice.py
   ```
   - Keep using `MODAL_ENDPOINT_URL` for this

2. Deploy Route Finder script:
   ```
   modal deploy docs/modal-processor-route-finder.py
   ```
   - Get the new endpoint URL

3. Add secret `MODAL_ROUTE_FINDER_ENDPOINT_URL` with the new Route Finder endpoint

4. Redeploy edge functions (automatic)

5. Test by uploading a map with "Route Finder" mode selected

