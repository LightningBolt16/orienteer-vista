
# Admin Upload Maps Improvements

## Overview
Enhance the admin map upload page with three major features:
1. **New 1:1 Square Format Support** - Upload single square images that get dynamically cropped
2. **Client-Side Adaptive Cropping** - Crop to user's actual screen aspect ratio for better fullscreen experience
3. **Map Version Comparison** - Compare new uploads with existing maps before replacing

---

## Phase 1: Database Schema Updates

### 1.1 Update `route_images` Table Constraints
Add support for '1:1' aspect ratio in the database:

```sql
-- Modify aspect_ratio check constraint to include '1:1'
ALTER TABLE route_images 
DROP CONSTRAINT IF EXISTS route_images_aspect_ratio_check;

ALTER TABLE route_images 
ADD CONSTRAINT route_images_aspect_ratio_check 
CHECK (aspect_ratio IN ('16_9', '9_16', '16:9', '9:16', '1:1'));
```

The `route_images` table will store:
- `aspect_ratio = '1:1'` for new square format (one row per route instead of two)
- `aspect_ratio = '16_9'` or `'9_16'` for legacy format (two rows per route)

---

## Phase 2: Upload Wizard Updates

### 2.1 Folder Structure Detection
Update `validateFolder` in `src/hooks/useMapUpload.ts` to detect format:

**New folder structure option:**
```
{MapName}/
  ├── 1_1/
  │   └── candidate_1.webp ... candidate_N.webp
  └── {MapName}.csv
```

**Legacy folder structure:**
```
{MapName}/
  ├── 16_9/
  │   └── candidate_1.webp ... candidate_N.webp  
  ├── 9_16/
  │   └── candidate_1.webp ... candidate_N.webp
  └── {MapName}.csv
```

The hook will:
1. Check for `1_1/` folder first (new format)
2. Fall back to `16_9/` + `9_16/` folders (legacy format)
3. Set `imageFormat: '1:1' | 'legacy'` in validation result

### 2.2 Update MapUploadWizard UI
Update `src/components/admin/MapUploadWizard.tsx`:

1. Show detected format in validation step (1:1 vs legacy)
2. Display image count (halved for 1:1 format)
3. Update folder structure example to show both options

### 2.3 Upload Logic Changes
Update `uploadMap` function:

For **1:1 format**:
- Upload to `{mapname}/1_1/` folder in storage
- Insert single row per route with `aspect_ratio = '1:1'`

For **legacy format**:
- Keep existing dual-upload behavior
- Insert two rows per route (16_9 and 9_16)

---

## Phase 3: Map Version Comparison Step

### 3.1 New Comparison Component
Create `src/components/admin/MapVersionComparison.tsx`:

This component shows when uploading a map with the same name as an existing one:

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Existing Map Found: "Matera"                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐    ┌──────────────────┐      │
│  │   EXISTING       │    │   NEW UPLOAD     │      │
│  │   [Preview]      │    │   [Preview]      │      │
│  │                  │    │                  │      │
│  │  500 routes      │    │  750 routes      │      │
│  │  Created Jan 3   │    │  Today           │      │
│  │  Format: Legacy  │    │  Format: 1:1     │      │
│  └──────────────────┘    └──────────────────┘      │
│                                                     │
│  What would you like to do?                        │
│                                                     │
│  [Replace Existing]  [Upload as New Name]  [Cancel]│
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Side-by-side preview of first route from each version
- Route count comparison
- Format comparison (1:1 vs legacy)
- Creation date of existing map
- Three actions: Replace, Rename, Cancel

### 3.2 Add Comparison Step to Wizard Flow
Update wizard steps: `select` → `validate` → **`compare`** → `upload` → `complete`

The compare step:
1. Queries `route_maps` for existing map with same name
2. If found, shows `MapVersionComparison` component
3. User chooses action before proceeding

### 3.3 Replace Existing Map Logic
When user chooses "Replace Existing":

1. Delete old `route_images` records for the map
2. Delete old images from storage bucket
3. Delete old `route_maps` entry
4. Proceed with new upload

```typescript
async function replaceExistingMap(existingMapId: string): Promise<void> {
  // 1. Get existing image paths
  const { data: oldImages } = await supabase
    .from('route_images')
    .select('image_path')
    .eq('map_id', existingMapId);
  
  // 2. Delete from storage
  if (oldImages?.length) {
    const paths = oldImages.map(i => i.image_path);
    await supabase.storage.from('route-images').remove(paths);
  }
  
  // 3. Delete route_images records
  await supabase.from('route_images').delete().eq('map_id', existingMapId);
  
  // 4. Delete route_maps entry
  await supabase.from('route_maps').delete().eq('id', existingMapId);
}
```

---

## Phase 4: Client-Side Adaptive Cropping

### 4.1 Screen Aspect Ratio Detection Hook
Create `src/hooks/useScreenAspect.ts`:

```typescript
interface ScreenAspect {
  width: number;
  height: number;
  ratio: number;  // width/height
  category: 'ultrawide' | 'wide' | 'standard' | 'portrait' | 'tall';
}

function useScreenAspect(): ScreenAspect {
  // Returns current screen dimensions and aspect category
  // Updates on resize/orientation change
}
```

Categories:
- **ultrawide**: ratio > 2.0 (21:9 monitors)
- **wide**: ratio 1.6-2.0 (16:9, 16:10)  
- **standard**: ratio 1.3-1.6 (4:3)
- **portrait**: ratio 0.5-0.75 (9:16 phones)
- **tall**: ratio < 0.5 (unusual tall screens)

### 4.2 Dynamic Image Cropper Component
Create `src/components/map/AdaptiveCropImage.tsx`:

```typescript
interface AdaptiveCropImageProps {
  src: string;
  sourceAspect: '1:1' | '16_9' | '9_16';
  className?: string;
  alt?: string;
}
```

**Behavior for 1:1 source images:**
- Crop to screen aspect ratio using CSS `object-fit: cover` + `object-position`
- Calculate visible region based on screen aspect vs 1:1
- For 21:9 ultrawide: crop top/bottom from center
- For 9:16 portrait: crop left/right from center
- Always keep the route visible (center-weighted)

**Implementation:**
```css
/* Example for ultrawide (21:9) from 1:1 source */
.adaptive-crop-ultrawide {
  object-fit: cover;
  object-position: center center;
  aspect-ratio: 21/9;
}

/* Example for portrait (9:16) from 1:1 source */
.adaptive-crop-portrait {
  object-fit: cover;
  object-position: center center;
  aspect-ratio: 9/16;
}
```

### 4.3 Update Route Selectors
Modify `RouteSelector.tsx` and `MobileRouteSelector.tsx`:

1. Detect if current route uses '1:1' format
2. Use `AdaptiveCropImage` component for 1:1 routes
3. Keep existing `object-contain` for legacy format
4. In fullscreen mode: fill entire screen with adaptive crop (no black bars)

**For fullscreen 1:1 images:**
```tsx
<AdaptiveCropImage
  src={currentRoute.imagePath}
  sourceAspect="1:1"
  className="w-screen h-screen"
  alt={`Route ${currentRoute.candidateIndex}`}
/>
```

### 4.4 Update Route Data Utilities
Modify `src/utils/routeDataUtils.ts`:

1. Handle '1:1' aspect ratio in queries
2. For 1:1 maps, don't filter by mobile/desktop aspect
3. Return `sourceAspect` property in `RouteData`

```typescript
// When loading routes for 1:1 maps
const { data: dbRoutes } = await supabase
  .from('route_images')
  .select('...')
  .eq('map_id', mapSource.id)
  .eq('aspect_ratio', '1:1');  // Single query, not filtered by device

// In RouteData interface
interface RouteData {
  // ... existing fields
  sourceAspect?: '1:1' | '16_9' | '9_16';
}
```

---

## Phase 5: Updated Wizard Steps

### Final Step Flow:

```
1. SELECT FOLDER
   - User selects folder
   - Detect format (1:1 or legacy)

2. VALIDATE
   - Show detected format
   - Show image counts
   - Show CSV preview
   - Metadata inputs (country, type, logo)

3. COMPARE (conditional)
   - Only shown if map name exists
   - Side-by-side comparison
   - Choose: Replace / Rename / Cancel

4. UPLOAD
   - If replacing: delete old first
   - Upload images to storage
   - Save metadata to database
   - Progress bar with stages

5. COMPLETE
   - Success message
   - Link to test routes
```

---

## Technical Summary

### Files to Create:
- `src/components/admin/MapVersionComparison.tsx` - Comparison UI
- `src/components/map/AdaptiveCropImage.tsx` - Dynamic cropping component
- `src/hooks/useScreenAspect.ts` - Screen aspect detection hook

### Files to Modify:
- `src/hooks/useMapUpload.ts` - Add 1:1 format detection, comparison query, replace logic
- `src/components/admin/MapUploadWizard.tsx` - Add compare step, update UI
- `src/components/RouteSelector.tsx` - Use adaptive cropping for 1:1 images
- `src/components/MobileRouteSelector.tsx` - Use adaptive cropping for 1:1 images  
- `src/utils/routeDataUtils.ts` - Handle 1:1 aspect in queries and data loading

### Database Migration:
- Update `route_images.aspect_ratio` constraint to allow '1:1'

---

## Benefits

1. **Reduced file count**: 1:1 format = half the images to generate/store
2. **Better fullscreen experience**: No black bars on any screen aspect ratio
3. **Ultrawide support**: 21:9 monitors get proper full coverage
4. **Easier version management**: Clear comparison before replacing maps
5. **Backward compatible**: Legacy 16:9/9:16 format still fully supported
