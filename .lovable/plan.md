

# Plan: Beta Mode for Route Finder & Route Navigator

Hide Route Finder and Route Navigator behind a per-user "Beta features" toggle. When enabled, surface them with clear BETA badges, show an intro popup explaining their experimental status, and add an in-game feedback box.

## What the user will experience

**Default users (Beta off):**
- No "Route Finder" or "Route Navigator" links in the header (desktop nav and mobile menu).
- No "Route Finder" / "Route Navigator" buttons on the homepage.
- Direct visits to `/route-finder` or `/route-navigator` redirect to `/profile?tab=beta` with a toast prompting them to enable beta features.

**Beta-enabled users:**
- Header and homepage show both modes again, each with a small magenta "BETA" badge next to the label.
- The first time they enable beta, a popup appears: title "Beta features enabled", body explaining these modes are still in development and inviting feedback, plus a "Got it" button.
- Inside Route Finder and Route Navigator pages, a compact, dismissible "Beta feedback" box sits above the game content with a textarea + Submit button. Submissions are stored as `feature_requests` rows (title auto-set to "Beta feedback: Route Finder" / "Beta feedback: Route Navigator").

**Profile → new "Beta features" section** (visible to all signed-in users):
- A `Switch` labelled "Enable beta features" with a short description.
- When toggled on, the explainer popup is shown immediately and the preference is persisted.

## Technical changes

**Database (migration):**
- Add `beta_features_enabled boolean NOT NULL DEFAULT false` to `user_profiles`.
- Add `beta_intro_seen boolean NOT NULL DEFAULT false` to `user_profiles` (so the intro popup only auto-shows once after first opt-in).
- Relax `feature_requests` INSERT policy OR keep current pro-only restriction and instead store beta feedback in a new lightweight `beta_feedback` table:
  - `beta_feedback (id uuid pk, user_id uuid, feature text check in ('route_finder','route_navigator'), message text, created_at timestamptz default now())`
  - RLS: any authenticated user can insert their own row; admins can read all; users can read their own.

**New hook:** `src/hooks/useBetaFeatures.ts`
- Reads `beta_features_enabled` and `beta_intro_seen` from `user_profiles`.
- Exposes `{ betaEnabled, introSeen, setBetaEnabled, markIntroSeen, loading }`.
- Guests (`user.id === '1'`) always return `betaEnabled: false`.

**Header (`src/components/Header.tsx`):**
- Wrap the two `Link` blocks (desktop + mobile) for `/route-finder` and `/route-navigator` in `{betaEnabled && (...)}`.
- Append a small `BETA` badge component inside each link.

**Homepage (`src/pages/Index.tsx`):**
- Conditionally render the Route Finder / Route Navigator buttons based on `betaEnabled`, with a BETA badge inside each.

**Profile (`src/pages/Profile.tsx`):**
- Add a "Beta features" card (above or alongside subscription section). Contains the toggle + description. When the user flips it on for the first time, open `BetaIntroDialog`.

**New components:**
- `src/components/beta/BetaBadge.tsx` — small magenta pill ("BETA").
- `src/components/beta/BetaIntroDialog.tsx` — explainer popup ("These features are in active development… your feedback is much appreciated"), with a "Got it" button that calls `markIntroSeen`.
- `src/components/beta/BetaFeedbackBox.tsx` — collapsible card with textarea + Submit; takes a `feature: 'route_finder' | 'route_navigator'` prop; inserts into `beta_feedback`; shows toast on success; remembers dismissed state in `localStorage` per feature.

**Route guards in `RouteFinder.tsx` and `RouteNavigator.tsx`:**
- After auth load, if `!betaEnabled`, navigate to `/profile?tab=beta` with a sonner toast: "This feature is in beta. Enable beta features to access it."
- If beta is enabled, mount `<BetaFeedbackBox feature="..." />` near the top of the page (above the map selector / game container).

**Localization (`LanguageContext.tsx`):**
- Add EN/SV strings: `betaFeatures`, `betaFeaturesDescription`, `betaEnabledTitle`, `betaEnabledBody`, `gotIt`, `betaFeedbackTitle`, `betaFeedbackPlaceholder`, `submitFeedback`, `feedbackThanks`, `betaRequiredToast`.

**Files added:**
- `supabase/migrations/<timestamp>_beta_features.sql`
- `src/hooks/useBetaFeatures.ts`
- `src/components/beta/BetaBadge.tsx`
- `src/components/beta/BetaIntroDialog.tsx`
- `src/components/beta/BetaFeedbackBox.tsx`

**Files edited:**
- `src/components/Header.tsx`
- `src/pages/Index.tsx`
- `src/pages/Profile.tsx`
- `src/pages/RouteFinder.tsx`
- `src/pages/RouteNavigator.tsx`
- `src/context/LanguageContext.tsx`

## Out of scope
- Admins still see beta routes only if they personally enable the toggle (no admin override).
- No analytics on beta usage beyond the feedback table.
- Existing leaderboard / map data for these modes is left untouched.

