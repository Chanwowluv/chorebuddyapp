# Subscription Tiers

ChoreBuddyApp offers four subscription tiers: **Free**, **Premium**, **Family Plus**

---

## Tier Overview

| Feature / Limit              | Free          | Premium                          | Family Plus                      | Enterprise                       |
|------------------------------|---------------|----------------------------------|----------------------------------|----------------------------------|
| **Price**                    | $0/month      | $15/month or $120/year (save 20%)| $25/month or $200/year (save 33%)| $49/month or $390/year (save 34%)|
| **Family members**           | 6             | 15                               | 30                               | 50                               |
| **Chores**                   | 10            | Unlimited                        | Unlimited                        | Unlimited                        |
| **Redeemable reward items**  | 5             | Unlimited                        | Unlimited                        | Unlimited                        |
| ChoreAI smart assignments    | No            | Yes                              | Yes                              | Yes                              |
| Recurring chores & rotations | No            | Yes                              | Yes                              | Yes                              |
| Photo verification           | No            | Yes                              | Yes                              | Yes                              |
| Chore approval system        | No            | Yes                              | Yes                              | Yes                              |
| Advanced chore settings      | No            | Yes                              | Yes                              | Yes                              |
| Custom points & bonuses      | No            | Yes                              | Yes                              | Yes                              |
| Early completion bonus       | No            | Yes                              | Yes                              | Yes                              |
| Priority assignment          | No            | Yes                              | Yes                              | Yes                              |
| Family email invitations     | No            | Yes                              | Yes                              | Yes                              |
| Family goals & challenges    | No            | No                               | Yes                              | Yes                              |
| Analytics export & reports   | No            | No                               | Yes                              | Yes                              |
| Weekly email reports         | No            | No                               | Yes                              | Yes                              |
| Priority support             | No            | No                               | No                               | Yes                              |

---

## Free Tier

The Free tier provides basic chore management for small families:

- **Up to 6 family members**
- **Up to 10 chores**
- **Up to 5 redeemable reward items**
- Manual chore assignment only
- Basic point tracking
- Basic rewards store

All 13 premium features are disabled on this tier.

## Premium Tier

The Premium tier unlocks core automation and management features:

- **$15/month** or **$120/year** (a 20% annual discount)
- **Up to 15 family members**
- Unlimited chores and reward items
- 14-day free trial available
- 10 premium features enabled: ChoreAI, advanced settings, recurring chores, chore approval, photo verification, custom points, priority assignment, early completion bonus, family invitations

## Family Plus Tier

The Family Plus tier adds family-oriented analytics and goal tracking:

- **$25/month** or **$200/year** (a 33% annual discount)
- **Up to 30 family members**
- Unlimited chores and reward items
- All Premium features plus: family goals & challenges, analytics export & reports, weekly email reports

## Enterprise Tier

The Enterprise tier provides the full feature set with maximum capacity:

- **$49/month** or **$390/year** (a 34% annual discount)
- **Up to 50 family members**
- Unlimited chores and reward items
- All Family Plus features plus: priority support, dedicated account manager, custom integrations, SLA guarantees

---

## How Feature Gating Works

### Frontend

1. **`useSubscriptionAccess` hook** (`src/components/hooks/useSubscriptionAccess.jsx`) — the central source of truth for all 4 tiers' feature matrices and resource limits. It exposes:
   - `canAccess(featureName)` — returns `true`/`false` for a given feature
   - `hasReachedLimit(limitType)` — checks whether the user has hit the cap for family members, chores, or reward items
   - `isPremium` / `isFamilyPlus` / `isEnterprise` / `isPaidTier` / `isFree` — convenience booleans

2. **`FeatureGate` component** (`src/components/ui/FeatureGate.jsx`) — wraps UI sections that require a specific feature. If the user lacks access, it either hides the content or redirects to the Pricing page.

3. **`UpgradeModal`** (`src/components/ui/UpgradeModal.jsx`) — shown when a user tries to use a feature not available on their tier.

4. **`LimitReachedModal`** (`src/components/ui/LimitReachedModal.jsx`) — shown when a user hits a resource limit.

### Backend

- `functions/generateReport.ts` restricts report generation to Family Plus and Enterprise tiers.
- `functions/lib/shared-utils.ts` validates feature access for email invitations (Premium+), ChoreAI (Premium+), reports (Family Plus+), family goals (Family Plus+), and priority support (Enterprise only).
- `src/hooks/validateSubscriptionChange.js` prevents downgrading if the family has more members than the target tier allows.

---

## Payment Flow

1. User selects a paid plan on the **Pricing page** (`src/pages/Pricing.jsx`)
2. Frontend calls `stripeCheckout` with `create-checkout-session` endpoint (`functions/stripeCheckout.ts`)
3. Backend creates a Stripe Checkout Session using monthly or yearly price IDs from environment variables
4. User is redirected to **Stripe's hosted checkout**
5. On success, Stripe fires a `checkout.session.completed` webhook
6. The webhook handler updates the user's `subscription_tier` and `subscription_status`
7. User is redirected to `/PaymentSuccess`

### Stripe Environment Variables

| Variable | Tier |
|----------|------|
| `STRIPE_PRICE_ID_MONTHLY` | Premium monthly |
| `STRIPE_PRICE_ID_YEARLY` | Premium yearly |
| `STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY` | Family Plus monthly |
| `STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY` | Family Plus yearly |
| `STRIPE_PRICE_ID_ENTERPRISE_MONTHLY` | Enterprise monthly |
| `STRIPE_PRICE_ID_ENTERPRISE_YEARLY` | Enterprise yearly |

### Subscription Lifecycle Events

| Stripe Event                        | Action                                          |
|-------------------------------------|--------------------------------------------------|
| `checkout.session.completed`        | Set tier from price ID, status from subscription  |
| `customer.subscription.created`     | Set tier from price ID, status to active           |
| `customer.subscription.updated`     | Update tier and status from subscription           |
| `customer.subscription.deleted`     | Downgrade to free, status to canceled              |
| `invoice.payment_failed`            | Set status to `past_due`                           |
| `invoice.payment_succeeded`         | Set status to `active`                             |

---

## Data Model

Subscription state is stored on the user object with these fields:

| Field                  | Values                                          |
|------------------------|--------------------------------------------------|
| `subscription_tier`    | `free`, `premium`, `family_plus`, `enterprise`    |
| `subscription_status`  | `active`, `trial`, `past_due`, `canceled`         |
| `stripe_customer_id`   | Stripe customer ID string                         |
| `trial_ends_at`        | ISO 8601 timestamp (set during trial init)        |

---

## Consistent Limits Across Files

All files now use these consistent member limits:

| Tier          | Members | Chores    | Reward Items |
|---------------|---------|-----------|--------------|
| Free          | 6       | 10        | 5            |
| Premium       | 15      | Unlimited | Unlimited    |
| Family Plus   | 30      | Unlimited | Unlimited    |
| Enterprise    | 50      | Unlimited | Unlimited    |

Files that enforce these limits:
- `src/components/hooks/useSubscriptionAccess.jsx` (frontend feature gate)
- `src/components/lib/constants.jsx` (frontend constants)
- `src/components/lib/appConstants.jsx` (app constants)
- `src/components/utils/familyHelpers.jsx` (component helper)
- `src/utils/familyHelpers.js` (utility helper)
- `src/components/people/PersonFormModal.jsx` (form validation)
- `src/hooks/validateSubscriptionChange.js` (downgrade validation)
- `functions/lib/shared-utils.ts` (backend validation)
