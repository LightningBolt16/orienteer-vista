

## Unified Map Management System

### Current State

The codebase has fragmented map management spread across multiple pages and components:

- **Admin Upload** (`/admin/upload-maps`): Uploads Route Choice maps only via folder (CSV + images). No Route Finder upload support.
- **Admin Visibility** (`/admin/map-visibility`): Toggles `is_hidden` on admin maps. Shows ALL maps (including private/community) which is wrong per requirements.
- **User Maps** (`/my-maps`): Upload TIF files for processing. Shows `user_maps` (source files), not the resulting `route_maps`/`route_finder_maps`. Can publish to community. Cannot rename, add logos, hide, or manage Route Finder maps.
- **Publish Dialogs**: Separate for Route Choice (`PublishMapDialog`, `PublishRouteMapDialog`) and Route Finder (`PublishRouteFinderMapDialog`). Similar but duplicated.

### Target Architecture

Two consolidated pages with clear separation:

**1. Admin Map Manager** (`/admin/maps`) — for official maps only (`map_category = 'official'`)
**2. My Maps** (`/my-maps`) — for private + community maps owned by the current user

---

### Plan

#### Phase 1: Unified Admin Page

Merge `UploadMaps` and `ManageMapVisibility` into a single **Admin Map Manager** page at `/admin/maps`.

**Sections via tabs**: Route Choice | Route Finder

Each tab shows a list of official maps (`map_category = 'official'` or `NULL`) with:
- Visibility toggle (is_hidden)
- Inline rename (editable name field)
- Logo upload/change button
- Country code selector
- Map type selector

**Upload panel**: At the top of each tab, an "Upload New Map" button that:
- For Route Choice: opens the existing `MapUploadWizard` (folder upload)
- For Route Finder: opens a new `RouteFinderUploadWizard` that accepts the `exports_finder/{MapName}/` folder structure (1_1 images + JSON challenges file)

The Route Finder admin upload wizard will:
1. Accept a folder containing `1_1/` directory with `challenge_X_base.webp` and `challenge_X_answer.webp` files, plus the `{MapName}_finder_challenges.json` file
2. Validate the folder structure and parse the JSON
3. Upload images to storage bucket
4. Insert records into `route_finder_maps` (with `map_category = 'official'`) and `route_finder_challenges` with the new safe_zone data

**Files to create/modify**:
- Create `src/pages/admin/AdminMapManager.tsx` — unified page
- Create `src/components/admin/AdminMapCard.tsx` — reusable inline-editable card for each map
- Create `src/components/admin/RouteFinderUploadWizard.tsx` — folder upload for Route Finder
- Modify `src/App.tsx` — replace `/admin/upload-maps` and `/admin/map-visibility` routes with `/admin/maps`
- Delete (or deprecate) `ManageMapVisibility.tsx` and `UploadMaps.tsx`

#### Phase 2: Enhanced My Maps Page

Rebuild `UserMaps.tsx` to show the user's **resulting maps** (from `route_maps` and `route_finder_maps` where `user_id = current_user`) rather than just `user_maps` source records.

**Sections via tabs**: Route Choice | Route Finder

Each tab shows cards for the user's private + community maps with:
- Badge showing status: "Private" or "Published to Community" (based on `map_category`)
- Inline rename
- Logo upload/change
- Location picker (for community maps, or to set before publishing)
- Country code selector
- **Hide toggle** for private maps (`is_hidden`), hidden from game selectors but still in account
- **Publish to Community** button for private maps
- **Unpublish (Make Private)** button for community maps — sets `is_public = false`, `map_category = 'private'`
- Processing status indicator (linked back to `user_maps` via `source_map_id`)

The upload wizard stays as-is (TIF upload flow), it already supports both Route Choice and Route Finder processing modes.

**Files to modify**:
- Rewrite `src/pages/UserMaps.tsx` to query `route_maps` + `route_finder_maps` instead of only `user_maps`
- Keep `user_maps` section as a "Processing Queue" subsection showing pending/processing/failed source maps
- Add inline editing components (rename, logo, location, hide toggle)

#### Phase 3: Webhook Updates for Route Finder 1:1

Update the `map-processing-webhook` edge function's `rf-complete` endpoint to support the new 1:1 safe_zone format:

- Add `safe_zone` column to `route_finder_challenges` table (migration needed — JSONB, nullable)
- Update `rf-complete` handler to store `safe_zone` from challenge data
- Update the `aspect_ratio` handling to support `'1_1'` for Route Finder challenges

**Database migration**:
```sql
ALTER TABLE route_finder_challenges ADD COLUMN IF NOT EXISTS safe_zone jsonb;
```

#### Phase 4: Route Finder Admin Upload Parser

The admin Route Finder upload flow will:
1. Read `{MapName}_finder_challenges.json` from the selected folder
2. Parse each challenge object (same schema as Modal webhook payload)
3. Upload `1_1/challenge_X_base.webp` and `1_1/challenge_X_answer.webp` to storage
4. Prepend the storage bucket URL to image paths
5. Insert into `route_finder_maps` with `map_category = 'official'`
6. Insert challenges into `route_finder_challenges` with safe_zone, graph_data, etc.

Also upload any `challenge_X_mask.webp` impassability masks if present.

---

### Summary of Changes

| Area | Action |
|------|--------|
| `/admin/maps` (new) | Merged upload + visibility + rename + logo for official maps, both game modes |
| `/my-maps` (enhanced) | Shows resulting maps, not source files. Tabs for RC/RF. Hide, publish, unpublish, rename, logo |
| `route_finder_challenges` | Add `safe_zone` JSONB column |
| `map-processing-webhook` | Store safe_zone in rf-complete |
| Route Finder admin upload | New wizard for folder-based upload of processed RF challenges |
| Old pages | Remove `UploadMaps`, `ManageMapVisibility` as separate routes |

### Filtering Rules

- **Admin page**: Only shows maps where `map_category IN ('official', NULL)` — never private or community maps
- **My Maps page**: Only shows maps where `user_id = current_user` and `map_category IN ('private', 'community')` — never official maps
- **Community maps cannot be hidden** — only unpublished (reverted to private)
- **Private maps can be hidden** — `is_hidden = true` removes from game selectors

