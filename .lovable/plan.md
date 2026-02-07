
# Route Finder Fixes Plan

## Overview
This plan addresses three issues with the Route Finder game mode:

1. **Scores going to wrong leaderboard** - Route Finder attempts are incorrectly updating the Route Choice leaderboard
2. **Header button text** - Shows "routeFinder" instead of "Route Finder"
3. **Missing private/community sections** - Map selector doesn't show private and community sections when empty

---

## Issue 1: Scores Going to Wrong Leaderboard

### Problem
In `src/components/route-finder/RouteFinderGame.tsx` at line 225, after saving the attempt to `route_finder_attempts`, the code calls:

```typescript
updatePerformance(isCorrect, responseTime);
```

The `updatePerformance` function in `UserContext.tsx` (lines 304-312) inserts records into the `route_attempts` table (which is for Route Choice game) and updates `user_profiles` statistics. This means every Route Finder attempt:
- Creates a duplicate entry in `route_attempts` 
- Artificially inflates Route Choice leaderboard stats
- Pollutes the Route Choice leaderboard with Route Finder data

### Solution
Remove the `updatePerformance` call from `RouteFinderGame.tsx`. Route Finder already correctly saves attempts to `route_finder_attempts` table at lines 215-222. The Route Finder has its own separate leaderboard that reads from `route_finder_attempts`.

### Files to Modify
- `src/components/route-finder/RouteFinderGame.tsx` - Remove line 225 (`updatePerformance(isCorrect, responseTime)`)

---

## Issue 2: Header Button Shows "routeFinder"

### Problem
In `src/components/Header.tsx`, the navigation link text uses:

```typescript
<span>{t('routeFinder') || 'Route Finder'}</span>
```

The translation key `routeFinder` does not exist in `LanguageContext.tsx`, so it falls back to the raw key "routeFinder" instead of "Route Finder". The fallback `|| 'Route Finder'` isn't working because `t()` returns the key itself when not found (which is truthy).

### Solution
Add the `routeFinder` translation key to both English and Swedish translations in `LanguageContext.tsx`.

### Files to Modify
- `src/context/LanguageContext.tsx` - Add translation entries:
  - English: `routeFinder: 'Route Finder'`
  - Swedish: `routeFinder: 'Ruttfinnare'` (or similar Swedish translation)

---

## Issue 3: Missing Private/Community Sections

### Problem
In `src/components/route-finder/RouteFinderMapSelector.tsx`, the Private Maps and Community Maps collapsible sections are conditionally rendered only when there are maps:

```typescript
// Line 203 - Private maps only shown if length > 0
{isLoggedIn && privateMaps.length > 0 && onPrivateMapsOpenChange && (

// Line 282 - Community maps only shown if length > 0  
{communityMaps.length > 0 && onCommunityMapsOpenChange && (
```

This means users never see these sections until maps exist, so they don't know they can upload their own maps.

### Solution
Show both sections even when empty, with helpful placeholder messages encouraging users to create/upload maps. This mirrors the Route Choice game behavior.

### Files to Modify
- `src/components/route-finder/RouteFinderMapSelector.tsx`:
  - Change condition from `privateMaps.length > 0` to `isLoggedIn && onPrivateMapsOpenChange`
  - Add empty state message inside Private Maps section: "No private maps yet. Go to My Maps to process Route Finder challenges from your uploaded maps."
  - Change Community Maps condition from `communityMaps.length > 0` to just `onCommunityMapsOpenChange`  
  - Add empty state message inside Community Maps section: "No community maps available yet. Publish your private maps to share with others!"

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/route-finder/RouteFinderGame.tsx` | Remove `updatePerformance` call (line 225) |
| `src/context/LanguageContext.tsx` | Add `routeFinder` translation key for EN and SV |
| `src/components/route-finder/RouteFinderMapSelector.tsx` | Show Private/Community sections always (for logged-in users), with empty state messages |

---

## Technical Notes

- The Route Finder leaderboard (`RouteFinderLeaderboardInline` in RouteFinder.tsx) correctly aggregates from `route_finder_attempts` table
- The Route Choice leaderboard uses `route_attempts` table and `user_profiles` statistics
- These two systems should remain completely separate
- Removing `updatePerformance` ensures Route Finder stats only affect the Route Finder leaderboard

