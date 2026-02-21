

## Freemium Subscription Model with Stripe

### Overview

Integrate Stripe payments to power a freemium subscription model with three tiers: **Free**, **Personal** (29-49 SEK/month), and **Club** (for club admins). This connects the existing role system (`user_roles` table) with Stripe subscriptions for automated access management.

### Tier Summary (from Business Plan)

| Tier | Price | Key Limits |
|------|-------|-----------|
| Free | 0 kr | 100 plays/day, 5 projects, 3 maps, limited default maps |
| Personal | 29-49 SEK/month | Unlimited plays, projects, maps, sharing, expanded map library |
| Club | TBD/month | Everything in Personal for all club members, role-based access |

### Implementation Steps

#### 1. Enable Stripe Integration
- Use Lovable's built-in Stripe integration tool to connect the user's Stripe account
- This will expose additional Stripe tools for creating products, prices, and checkout sessions

#### 2. Database Changes
- Add a `subscriptions` table to track active Stripe subscriptions:
  - `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan_type` (free/personal/club), `status` (active/canceled/past_due), `current_period_end`, `created_at`, `updated_at`
- Add a `club_id` column (nullable) to link club subscriptions to specific clubs
- RLS policies: users can read their own subscription; service role manages writes via webhook

#### 3. Stripe Products and Prices
- Create two Stripe products: "Personal Plan" and "Club Plan"
- Create recurring prices in SEK (monthly billing)

#### 4. Edge Functions
- **create-checkout-session**: Creates a Stripe Checkout session for Personal or Club plan. Requires authenticated user. Stores `stripe_customer_id` on the subscription record.
- **stripe-webhook**: Handles Stripe events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`). On successful payment, inserts/updates the `subscriptions` table and grants the appropriate role in `user_roles`. On cancellation, removes the role.
- **create-portal-session**: Creates a Stripe Customer Portal session so users can manage billing, cancel, or update payment methods.

#### 5. Subscription Hook (`useSubscription`)
- New hook that queries the `subscriptions` table for the current user
- Returns: `plan` (free/personal/club), `status`, `isActive`, `currentPeriodEnd`, `loading`
- Replaces or augments `useProAccess` -- pro access = personal or club subscription (or admin role)

#### 6. Update `useProAccess`
- Modify to also check the `subscriptions` table, not just `user_roles`
- A user has pro access if they have an active personal/club subscription OR an admin/pro role

#### 7. Profile Page -- Subscription Management
- Add a "Subscription" section to the Profile page
- Shows current plan, next billing date, and a "Manage Subscription" button (opens Stripe Customer Portal)
- If on free tier, show an upgrade CTA linking to the Subscription page

#### 8. Update Subscription Page (`Subscription.tsx`)
- Wire the existing "Subscribe" buttons to call `create-checkout-session` edge function
- After successful checkout, redirect back to profile with a success toast
- Add monthly/yearly toggle if desired (start with monthly only)

#### 9. Enforce Free Tier Limits (Future enforcement, scaffolding now)
- The infrastructure will be in place to check `plan` from the hook
- Actual enforcement of limits (100 plays/day, 3 maps, 5 projects) can be added incrementally
- Add a `useSubscriptionLimits` helper that returns limit values based on plan

#### 10. Club Plan Logic
- When a club admin subscribes to the Club plan, all members of their club get pro access
- The webhook checks `plan_type === 'club'` and grants access to the club's `club_id`
- `useProAccess` checks if the user belongs to a club with an active club subscription

### Files to Create
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/create-portal-session/index.ts`
- `src/hooks/useSubscription.ts`
- Database migration for `subscriptions` table

### Files to Modify
- `src/pages/Subscription.tsx` -- wire buttons to Stripe checkout
- `src/pages/Profile.tsx` -- add subscription management section
- `src/hooks/useProAccess.ts` -- check subscriptions table
- `supabase/config.toml` -- add new edge function configs

### Sequence

1. Enable Stripe (requires user input for secret key)
2. Create `subscriptions` table migration
3. Create edge functions (checkout, webhook, portal)
4. Create `useSubscription` hook
5. Update `useProAccess` to include subscription checks
6. Wire Subscription page buttons to checkout
7. Add subscription management to Profile page

