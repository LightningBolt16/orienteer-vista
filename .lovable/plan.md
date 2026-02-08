
# Route Finder & User Profile Improvements Plan

## Overview
This plan addresses four distinct features/fixes:

1. **Route Finder fullscreen exit broken** - Can't exit fullscreen mode on desktop
2. **Public user profile statistics** - Show performance over time on public profiles
3. **Country selection for profiles** - Add country field to user profiles
4. **Onboarding tutorial** - Multi-step welcome guide for new users

---

## Issue 1: Route Finder Fullscreen Exit Not Working

### Problem Analysis
Comparing `RouteFinder.tsx` (lines 160-180) with `RouteGame.tsx` (lines 76-107):

**RouteGame (working):**
```typescript
// Has fullscreenchange event listener (lines 98-107)
useEffect(() => {
  const handleFullscreenChange = () => {
    if (!isMobile && document.fullscreenEnabled) {
      setIsFullscreen(!!document.fullscreenElement);
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, [isMobile]);
```

**RouteFinder (broken):**
- Missing the `fullscreenchange` event listener
- The toggle logic tries to exit via `document.exitFullscreen()` but `document.fullscreenElement` is never set because we're using CSS-based fullscreen, not native fullscreen

### Solution
Fix the `toggleFullscreen` function to be consistent - use pure CSS-based fullscreen (simpler and more reliable). Remove the `document.exitFullscreen()` call since we're not using native fullscreen. Just toggle state:

```typescript
const toggleFullscreen = useCallback(() => {
  setIsFullscreen(prev => !prev);
}, []);
```

### Files to Modify
- `src/pages/RouteFinder.tsx` - Simplify toggleFullscreen to just toggle state

---

## Issue 2: Public User Profile Statistics Over Time

### Problem Analysis
Currently `UserProfile.tsx` (the public profile viewed by others) only shows:
- Overview stats (all-time accuracy, speed, attempts)
- Per-map performance

It does NOT show the "Progress" tab with performance graphs that exist in `Profile.tsx` (private profile). The user wants to make this data visible on public profiles.

### Solution
Add a "Progress" tab to `UserProfile.tsx` that fetches and displays performance over time for the viewed user, matching the graphs in `Profile.tsx`:
- Fetch `route_attempts` for the viewed user (public data via RLS - already allows SELECT for all)
- Add time filter selector (week/month/90days/all)
- Add accuracy, speed, and daily attempts charts using Recharts

### Technical Details

The `route_attempts` table has RLS policy "Authenticated users can view route attempts" with `USING: true` - meaning anyone can read attempts for any user. This data is already public.

### Files to Modify
- `src/pages/UserProfile.tsx`:
  - Add `performanceData` state and `timeFilter` state
  - Add `fetchPerformanceData` function (copy from Profile.tsx)
  - Add "Progress" tab with charts
  - Import `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer` from recharts
  - Import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
  - Import date-fns utilities

---

## Issue 3: Country Selection for User Profiles

### Problem Analysis
The `user_profiles` table currently does not have a `country_code` column. Need to:
1. Add the column to the database
2. Add UI for users to select their country in Profile.tsx
3. Display country flag on public profiles
4. Enable country filtering on leaderboard

### Database Migration
Add `country_code` column to `user_profiles`:

```sql
ALTER TABLE public.user_profiles 
ADD COLUMN country_code TEXT DEFAULT NULL;
```

### Technical Details

**Profile.tsx changes:**
- Add country selector dropdown (using existing country codes from the app)
- Save country_code to user_profiles on change
- Update UserContext to include country_code in UserProfile type

**UserProfile.tsx changes:**
- Display country flag next to user name using existing COUNTRY_FLAG_IMAGES mapping

**Leaderboard.tsx changes:**
- Add optional `countryFilter` prop
- Add country filter dropdown to leaderboard UI
- Fetch and filter by country_code when filter is active

### Files to Modify
- Database: Add migration for country_code column
- `src/context/UserContext.tsx` - Add country_code to UserProfile type and fetch/update logic
- `src/pages/Profile.tsx` - Add country selector section
- `src/pages/UserProfile.tsx` - Display country flag
- `src/components/Leaderboard.tsx` - Add country filter dropdown and filtering logic

---

## Issue 4: Onboarding Tutorial

### Problem Analysis
Need a multi-step onboarding flow for new users that:
1. Welcomes them to the app
2. Explains the game modes (Route Choice, Route Finder, Duel)
3. Ends with "Set up your profile" call-to-action

### Technical Details

**New database column:**
The existing `tutorial_seen` column tracks the Route Game tutorial. Need a new column for onboarding:

```sql
ALTER TABLE public.user_profiles 
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

**Component Structure:**
Create `OnboardingTutorial.tsx` with:
- Multi-step carousel/wizard (4 steps)
- Step 1: Welcome - "Welcome to Route Choice Champions!"
- Step 2: Route Choice - "Pick the faster route" game explanation
- Step 3: Route Finder - "Draw your route" game explanation  
- Step 4: Profile Setup - "Set up your profile" with country selection and call-to-action

**Trigger Location:**
- Show on Index.tsx when user is logged in but `onboarding_completed = false`
- After completion, navigate to Profile page for setup

### Files to Create/Modify
- Database: Add migration for onboarding_completed column
- Create `src/components/OnboardingTutorial.tsx` - Multi-step tutorial component
- `src/pages/Index.tsx` - Check onboarding status and show tutorial
- `src/context/LanguageContext.tsx` - Add translation keys for onboarding steps

---

## Summary of Database Changes

```sql
-- Migration: Add country and onboarding columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

---

## Files Summary

| File | Changes |
|------|---------|
| **Database Migration** | Add country_code and onboarding_completed columns |
| `src/pages/RouteFinder.tsx` | Simplify toggleFullscreen to just toggle state |
| `src/pages/UserProfile.tsx` | Add Progress tab with performance charts, display country flag |
| `src/pages/Profile.tsx` | Add country selector section |
| `src/pages/Index.tsx` | Check onboarding status and show OnboardingTutorial |
| `src/context/UserContext.tsx` | Add country_code to UserProfile type |
| `src/components/Leaderboard.tsx` | Add country filter dropdown |
| `src/components/OnboardingTutorial.tsx` | New multi-step onboarding component |
| `src/context/LanguageContext.tsx` | Add translation keys for onboarding |

---

## Country Codes Reference
The app already has country flag mappings in `src/utils/routeDataUtils.ts` and components. These same mappings will be reused:
- SE (Sweden)
- IT (Italy)  
- BE (Belgium)
- NO (Norway)
- FI (Finland)
- etc.

A dropdown with common orienteering countries will be provided for selection.

