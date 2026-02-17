

## Leaderboard Fixes and Improvements

### Issue 1: "All Maps" country filter not working

**Root cause**: The `fetchLeaderboard()` function in `UserContext.tsx` (line 197) does not include `country_code` in its select query. The context `leaderboard` state therefore has no `countryCode` field on entries. When the "All Maps" Leaderboard component uses this data, country filtering silently returns zero results.

**Fix** (two files):
- **`UserContext.tsx`**: Add `country_code` to the `fetchLeaderboard` select query (line 197) and include `countryCode` in the mapped entries (line 220-228). Also add `countryCode` to the `LeaderboardEntry` type (line 26-34).
- This ensures the context leaderboard has `countryCode` on every entry, making the client-side filter in `Leaderboard.tsx` work for "All Maps".

### Issue 2: Community Leaderboard text showing raw translation keys

**Root cause**: `t('communityLeaderboards')`, `t('communityLeaderboardsDesc')` are not defined in `LanguageContext.tsx`.

**Fix**: Add the following translation keys to both English and Swedish in `LanguageContext.tsx`:
- `communityLeaderboards` -- "Community Leaderboards" / "Community-topplista"
- `communityLeaderboardsDesc` -- "Rankings for community-created maps" / "Ranking for community-skapade kartor"
- `favoritedMaps` -- "Your Favorited Maps" / "Dina favoritkartor"
- `discoverMaps` -- "Discover Maps" / "Utforska kartor"
- `noFavoritedMaps` -- "No favorited maps yet" / "Inga favoritkartor an"
- `noFavoritedMapsDesc` -- "Use the map browser below to discover and favorite community maps" / "Anvand kartblaseraren nedan for att utforska och favoritmarkera community-kartor"

### Issue 3: Redesign Community Leaderboard section

**Current behavior**: Shows an "All Maps" tab that lists every community map's leaderboard stacked, plus individual map tabs. Always shows both Route Choice and Route Finder subsections regardless of the game mode toggle.

**New behavior**:
- Remove the "All Maps" tab from the community section
- Show only favorited community maps as tabs (from `useCommunityFavorites` hook)
- Below the tabs, embed the `CommunityMapBrowser` (Mapbox world map) so users can discover and favorite more maps directly from the leaderboard page
- The community section switches based on the `gameMode` toggle:
  - When "Route Choice" is selected: show Route Choice community leaderboards
  - When "Route Finder" is selected: show Route Finder community leaderboards
- If user has no favorites and no community maps exist, hide the section entirely

**Files to modify**:
- `src/pages/LeaderboardPage.tsx` -- Major refactor of the community section, import `useCommunityFavorites` and `CommunityMapBrowser`, wire gameMode to control which community leaderboard is shown
- `src/context/UserContext.tsx` -- Add `country_code` to `fetchLeaderboard` query and `LeaderboardEntry` type
- `src/context/LanguageContext.tsx` -- Add missing translation keys

### Technical Details

**UserContext.tsx changes:**
```text
Line 26-34: Add countryCode?: string to LeaderboardEntry type
Line 197: Change select to include country_code
Line 220-228: Add countryCode: entry.country_code to mapped entries
```

**LeaderboardPage.tsx changes:**
- Import `useCommunityFavorites` and `CommunityMapBrowser`
- Use the `gameMode` state to control which community content is rendered (Route Choice or Route Finder)
- Replace "All Maps" community tab with favorited maps only
- Add CommunityMapBrowser below the favorited leaderboard tabs for discovery
- When no favorites exist, show a message prompting the user to use the map browser
- For Route Finder community mode, use `RouteFinderLeaderboardInline` filtered to community maps only (pass a `mapCategory` or specific map names)

**LanguageContext.tsx changes:**
- Add all missing translation keys for both EN and SV

