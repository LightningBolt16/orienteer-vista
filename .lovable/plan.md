
Goal

Make Public Map Editing reliable by:
- showing the real source images when they exist
- restoring the B&W paint step
- marking maps as unavailable when the editor cannot actually load what it needs
- fixing the data pipeline so newly uploaded/published maps keep usable editor assets

What I found

1. The problem is real data loss / missing asset propagation, not just a UI bug.
- Database check: public `route_maps` = 9
- With `color_image_url` = 0
- With `impassability_image_url` = 1
- With `color_r2_key` = 4
- With `bw_r2_key` = 4
- Database check: `user_maps` = 22
- With `color_preview_url` = 0
- With `bw_preview_url` = 0

So the editor is usually given raw source keys, but not browser-loadable preview URLs.

2. Your B&W editor has not actually been removed, but the wizard hides it.
- In `PublicMapEditWizard.tsx`, the B&W step is only included when:
  `hasImpassability && bwPreviewUrl`
- That means a map with a real B&W source in storage but no preview URL never shows the step at all.

3. The select page is incorrectly optimistic.
- It labels maps as available from:
  - `map.bw_r2_key`
  - `map.color_r2_key`
- But those only mean “a raw source file exists”, not “the browser can render/edit it”.
- So maps are shown as usable even when the editor cannot actually display the source.

4. Your own newly uploaded public map fails for the same reason.
- `PublishMapDialog` just publishes the existing processed `route_map`.
- That `route_map` only has usable editor assets if preview URLs were copied through.
- For your recent maps, both `user_maps.color_preview_url` and `user_maps.bw_preview_url` are null, so the published map has no editable preview sources.

5. There is also a backend consistency gap.
- `map-processing-webhook` normal completion copies preview URLs into `route_maps`.
- But the stale/auto-complete path creates `route_maps` without copying preview URLs.
- So even if preview generation starts working, some maps can still be created in a broken editor state.

6. The “color fallback” is only half solved.
- The wizard can fall back to `route_images` for the color background after clone.
- But that fallback is not used on the map selection page to decide whether a map is truly editable.
- And there is no equivalent fallback for B&W, so B&W editing still disappears.

Why this is occurring

The core issue is that the public editor was redesigned to depend on browser-safe preview URLs, but the data pipeline never got completed end-to-end.

Current state:
```text
user uploads TIFFs
  -> raw source stored in R2
  -> processing creates route images
  -> public route_map created
  -> editor expects preview URLs
  -> preview URLs are mostly never stored/copied
  -> UI still treats raw R2 keys as “available”
  -> editor gets stuck / has no color source / hides B&W step
```

So there are really 3 separate failures:
1. preview generation/storage is not succeeding for new user maps
2. preview propagation into `route_maps` is incomplete
3. frontend availability logic is checking the wrong thing

Plan

1. Fix the source-of-truth for editor readiness
- Add a clear editor asset model for each public map:
  - `hasColorEditorSource`
  - `hasBwEditorSource`
  - `canEditPublicMap`
- Compute this from real browser-loadable assets:
  - color preview URL, or route-image fallback
  - B&W preview URL only
- Stop using raw `r2_*_key` presence as the UI signal for “available”.

2. Fix `PublicMapEditWizard.tsx`
- Always resolve assets into explicit states before entering edit steps:
  - `ready`
  - `partial`
  - `unavailable`
  - `error`
- Use route-image fallback for color preview when no color preview URL exists.
- Restore the B&W step when a B&W preview exists.
- If only color exists, skip B&W cleanly and explain why.
- Ensure the wizard always exits loading state.

3. Fix the map selection page
- Precompute editability per map before showing badges/buttons.
- Replace current labels with truthful statuses, for example:
  - “Color editing available”
  - “B&W editing available”
  - “Partially editable”
  - “Not available for editing”
- Prevent starting edit mode for maps with no usable editor assets.

4. Fix upload/publish pipeline for new maps
- Review and harden `UserMapUploadWizard.tsx` preview generation path.
- Make preview creation observable instead of silent:
  - if preview generation fails, store an explicit warning/state
  - do not silently leave the map with no editor previews
- Ensure preview URLs are written to `user_maps` for new uploads.

5. Fix route-map propagation
- In `map-processing-webhook/index.ts`, make both completion paths copy:
  - `color_preview_url -> route_maps.color_image_url`
  - `bw_preview_url -> route_maps.impassability_image_url`
  - plus existing R2 keys
- Ensure stale/auto-complete path does the same.

6. Backfill existing broken maps
- Add one migration/backfill step that copies preview URLs from linked `user_maps` into `route_maps` where available.
- Also backfill R2 keys where missing.
- Then identify maps still lacking previews so they can be marked unavailable rather than pretending to work.

7. Handle legacy/offical maps explicitly
- Official maps may only have admin-uploaded assets.
- Community/private-derived maps should prefer original uploaded source previews.
- If an official map has only route crops and no B&W preview, allow color-only boundary/ROI editing but do not claim B&W editing is available.

Files to update

Frontend:
- `src/components/user-maps/PublicMapEditWizard.tsx`
- `src/components/user-maps/UserMapUploadWizard.tsx`
- `src/components/user-maps/PublishMapDialog.tsx` if publish-time validation is needed
- possibly `src/pages/UserMaps.tsx` if entry gating/message belongs there

Backend:
- `supabase/functions/clone-public-map/index.ts`
- `supabase/functions/map-processing-webhook/index.ts`

Database:
- new migration to backfill `route_maps` from linked `user_maps`
- optionally add a derived/editability flag if we want simpler frontend queries

Technical details

Current confirmed broken examples:
```text
Public route map "Erikslund"
- has color_r2_key
- has bw_r2_key
- has NO color_image_url
- has NO impassability_image_url

Source user_map "Erikslund4"
- has r2_color_key
- has r2_bw_key
- has NO color_preview_url
- has NO bw_preview_url
```

That exactly explains:
- no color preview from source previews
- no B&W step
- map still looking “available” because raw keys exist

Recommended implementation order

1. Fix selection-page availability logic
2. Fix wizard state machine so it never hangs
3. Fix clone/backend asset resolution
4. Fix upload + processing propagation for new maps
5. Backfill existing maps
6. Verify official maps, community maps, and newly uploaded maps separately
