

## Subscription Model Overhaul

### 1. Create New Stripe Prices
The current products exist but have wrong prices. We need to create new prices:
- **Personal Plan**: 29 SEK/month (currently 49 SEK) -- new price on existing product `prod_U1DUQzYIDkyKaw`
- **Club Plan**: 100 SEK/month (currently 149 SEK) -- new price on existing product `prod_U1DZvSaAlZjkI4`

### 2. Update Price References
Update `useSubscription.ts` and `check-subscription` edge function with the new price IDs returned from Stripe.

### 3. Rework Subscription Page Features
**Remove** these features from the comparison table:
- Course Projects
- Project Sharing
- Role-Based Access Control
- Project Manager Access

**Replace with accurate features:**

| Feature | Free | Personal | Club |
|---------|------|----------|------|
| Route Game / Route Finder | Unlimited | Unlimited | Unlimited for all members |
| Private Map Processing | Limited (5 lifetime uploads) | Unlimited (Pro parameters) | Unlimited for all members |
| Club-Shared Private Maps | -- | -- | Yes (shared with club only) |

### 4. Rework Plan Card Descriptions
**Free Plan card:**
- Unlimited route game and route finder plays
- Limited map processing (basic parameters)
- Up to 5 lifetime map uploads

**Personal Plan card:**
- Everything in Free
- Unlimited private map processing with pro parameters
- Support development and request features
- Practice on your own maps, prepare for competitions

**Club Plan card:**
- Everything in Personal for all club members
- Club-shared private maps (visible only to your club)
- Manage club training with shared map library

### 5. Remove "Role-Based Access in Club Plan" Section
The entire bottom section (lines 477-580) with club roles (Admin, Coach, Course Setter, Event Organizer, Reviewer, Member) and project access categories is removed -- these features don't exist yet.

### 6. Rework Premium Benefits Section
**Remove:** "Community Sharing" and "Priority Support"

**Replace with:**
- **Support Development** -- Help us build new features and improve the platform
- **Request Features** -- Get a voice in what we build next
- **Train on Your Maps** -- Process your own maps for personalized training
- **Prepare for Competitions** -- Practice route choices on real competition terrain

### 7. Club-Shared Private Maps (New Feature Scaffolding)
Add a `club_id` column (nullable) to the `user_maps` table so maps can be associated with a club. Update RLS policies so club members can view maps shared with their club. This enables the club-exclusive map sharing feature promoted in the Club plan.

### Technical Details

**Files to modify:**
- `src/hooks/useSubscription.ts` -- update price IDs and display prices
- `supabase/functions/check-subscription/index.ts` -- update price IDs
- `src/pages/Subscription.tsx` -- full content rework (features, cards, benefits section)

**New Stripe prices to create:**
- Personal: 2900 ore (29 SEK) monthly on `prod_U1DUQzYIDkyKaw`
- Club: 10000 ore (100 SEK) monthly on `prod_U1DZvSaAlZjkI4`

**Database migration:**
- Add `club_id` column to `user_maps` table (nullable UUID, references clubs)
- Add RLS policy: club members can SELECT user_maps where club_id matches their club
- Add RLS policy: club admins can INSERT user_maps with their club_id

