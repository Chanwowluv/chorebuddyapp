# ChoreBuddyApp Security Architecture

> Last updated: 2026-03-02

## Overview

ChoreBuddyApp uses a **React + Vite** frontend with **Base44 Backend-as-a-Service** (14 Deno serverless functions). Security is enforced entirely at the **application layer** — there are no database-level Row-Level Security (RLS) policies. All access control flows through centralized utilities in `functions/lib/shared-utils.ts`.

---

## 1. Authentication

| Aspect | Implementation |
|--------|---------------|
| Provider | Base44 SDK (`base44.auth.me()`) |
| Token storage | `localStorage` key `base44_access_token` |
| Token source | URL query parameter `access_token` on initial load |
| Frontend guard | `AuthContext` in `src/lib/AuthContext.jsx` |
| Backend guard | `requireAuth()` in `functions/lib/shared-utils.ts` |
| Client config | `src/api/base44Client.js` — `requiresAuth: true` |

### Authentication Flow

```
1. App loads → extract token from URL params or localStorage
2. Fetch public settings (no token needed)
3. If token exists → call base44.auth.me() to validate
4. Success → set user + isAuthenticated = true
5. Failure (401/403) → redirect to login
```

### Public Pages (no auth required)

Defined in `src/constants/publicPages.js`:
- Home, Index, Pricing, Help, Privacy
- PaymentSuccess, PaymentCancel
- JoinFamily, RoleSelection

All other pages redirect unauthenticated users to login.

---

## 2. Authorization — Role-Based Access Control (RBAC)

### Family Roles

Defined in `src/utils/roles.js`:

| Role | Privileges |
|------|-----------|
| `parent` | Full admin — CRUD all entities, manage family, AI features, reports |
| `teen` | View + complete assigned chores, view rewards |
| `child` | Same as teen |
| `toddler` | Minimal — view assigned chores |

### Helper Functions

**Frontend** (`src/utils/roles.js`):
- `isParent(user)` — `family_role === 'parent'` or `role === 'admin'`
- `isChild(user)` — true for child, teen, or toddler

**Backend** (`functions/lib/shared-utils.ts`):
- `isParent(user)` — same logic, also checks `user.data.family_role`
- `requireAuth(base44)` — returns `{ user, error? }`, rejects if no valid user
- `requireParent(base44)` — calls `requireAuth` then checks `isParent`
- `requireFamily(base44)` — calls `requireAuth` then checks `getUserFamilyId`
- `validateFamilyAccess(user, familyId)` — confirms user's `family_id` matches target

### Backend Authorization Matrix

| Function | Auth Level | Additional Checks |
|----------|-----------|-------------------|
| `parentCrud.ts` | Parent-only | Entity whitelist, family ownership verification |
| `aiChoreAdvisor.ts` | Parent-only | — |
| `generateReport.ts` | Parent-only | Family Plus tier required |
| `smartAssignChores.ts` | Parent-only | Premium tier required |
| `inviteFamilyMember.ts` | Parent-only | Email validation, rate limiting (10/hr) |
| `sendChoreNotifications.ts` | Parent-only | Family validation |
| `sendGmailNotification.ts` | Parent-only | Internal email function |
| `learnChoreDifficulty.ts` | Parent-only | — |
| `processRecurringChores.ts` | Parent-only | — |
| `familyLinking.ts` | Auth (parent for code gen) | Rate limiting (5/5min) |
| `joinFamily.ts` | Auth | Code validation, tier-based member limits |
| `linkAccount.ts` | Auth | Parent-initiated or code-based |
| `sendNotifications.ts` | API key (`X-API-Key`) | Scheduled job |
| `stripeCheckout.ts` | Webhook signature | Stripe signature validation |

---

## 3. Data Entity Isolation

### Application-Level Access Control (No Database RLS)

All data isolation is enforced by the application layer. Every entity has a `family_id` field, and all queries filter by it:

```typescript
// Query pattern — every entity filtered by family_id
base44.asServiceRole.entities.Person.filter({ family_id: familyId })
```

### Cross-Family Protection

Before any mutation, the backend verifies entity ownership:

```typescript
// parentCrud.ts — ownership check before update/delete
const existing = await entities[entity].get(id);
if (existing.family_id !== familyId) {
  return forbiddenResponse('Access denied: entity belongs to a different family');
}
```

On create, the server enforces `family_id` — the client cannot override it:

```typescript
// parentCrud.ts — server-enforced scoping on create
const record = await entities[entity].create({
  ...data,
  family_id: familyId,   // Server enforces
  created_by: user.id,   // Server enforces
});
```

### Entity Whitelist

`parentCrud.ts` restricts which entities and operations are allowed:

```typescript
const ALLOWED_OPERATIONS = {
  Person: ['create', 'update', 'delete'],
  Chore: ['create', 'update', 'delete'],
  Assignment: ['create', 'delete'],
  RedeemableItem: ['create', 'update', 'delete'],
  FamilyGoal: ['create', 'update', 'delete'],
};
```

---

## 4. Data Entities

### Entity Relationship Diagram

```
Family (root)
 ├── User          (many, via family_id)
 ├── Person        (many, via family_id)
 │    ├── Assignment       (many, via person_id)
 │    ├── ChoreCompletion  (many, via person_id)
 │    ├── Reward           (many, via person_id)
 │    └── Achievement      (many, via person_id)
 ├── Chore         (many, via family_id)
 │    ├── Assignment       (many, via chore_id)
 │    └── ChoreCompletion  (many, via chore_id)
 ├── RedeemableItem (many, via family_id)
 └── FamilyGoal     (many, via family_id)
```

### Entity Summary

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **User** | email, family_id, family_role, subscription_tier, stripe_customer_id, linked_person_id | Auth identity + subscription owner |
| **Family** | name, owner_user_id, members[], invite_code, subscription_tier, user_linking_codes | Root entity, owns all data |
| **Person** | name, role, linked_user_id, points_balance, total_points_earned, skill_level, current_streak | Family member profile (may or may not be linked to a User) |
| **Chore** | title, category, difficulty, recurrence_pattern, rotation_person_order, auto_assign | Task definition with scheduling |
| **Assignment** | chore_id, person_id, week_start, due_date, completed, photo_url | Weekly chore assignment |
| **ChoreCompletion** | chore_id, person_id, completed_date, completion_time, difficulty_rating | Historical completion record |
| **Reward** | person_id, points, reward_type, reason, week_start | Points earned/deducted |
| **Achievement** | person_id, badge_type, earned_date, name | Badges and milestones |
| **RedeemableItem** | name, cost, category, created_by | Rewards catalog |
| **FamilyGoal** | title, target_value, current_value, deadline, category | Family-wide objectives |

All entities are family-scoped via `family_id`.

---

## 5. Subscription-Based Feature Gating

Defined in `src/constants/subscriptionTiers.js` (frontend) and `functions/lib/shared-utils.ts` (backend).

### Tier Limits

| Tier | Members | Chores | Redeemable Items |
|------|---------|--------|-----------------|
| Free | 6 | 10 | 5 |
| Premium | 15 | Unlimited | Unlimited |
| Family Plus | 30 | Unlimited | Unlimited |
| Enterprise | 50 | Unlimited | Unlimited |

### Feature Matrix

| Feature | Free | Premium | Family Plus | Enterprise |
|---------|------|---------|------------|------------|
| ChoreAI smart assignment | - | Y | Y | Y |
| Recurring chores | - | Y | Y | Y |
| Approval system | - | Y | Y | Y |
| Photo verification | - | Y | Y | Y |
| Custom points | - | Y | Y | Y |
| Priority assignment | - | Y | Y | Y |
| Family invitations | - | Y | Y | Y |
| Family goals | - | - | Y | Y |
| Analytics export | - | - | Y | Y |
| Weekly reports | - | - | Y | Y |
| Premium support | - | - | - | Y |

### Enforcement

- **Frontend:** `useSubscriptionAccess()` hook (`src/components/hooks/useSubscriptionAccess.jsx`) + `<FeatureGate>` component (`src/components/ui/FeatureGate.jsx`)
- **Backend:** `hasFeatureAccess(tier, feature)` in `functions/lib/shared-utils.ts`

---

## 6. Input Validation & Sanitization

All validation utilities in `functions/lib/shared-utils.ts`:

| Function | Purpose |
|----------|---------|
| `isValidEmail(email)` | Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `isValidRole(role)` | Checks against `['parent', 'teen', 'child', 'toddler']` |
| `sanitizeCode(code)` | Trim, uppercase, min length 6, rejects `<>'"\\` |
| `sanitizeString(input, maxLength)` | Trim + truncate (default 500 chars) |
| `parseRequestBody(req)` | Safe JSON parsing with structured error |
| `generateCode(length)` | Cryptographic-style random code (excludes ambiguous chars) |

---

## 7. Rate Limiting

In-memory `Map`-based rate limiter in `functions/lib/shared-utils.ts`:

```typescript
checkRateLimit(userId, action, maxRequests, windowMs)
```

| Action | Limit | Window |
|--------|-------|--------|
| Linking code generation | 5 requests | 5 minutes |
| Email invitations | 10 requests | 1 hour |

**Note:** The in-memory store resets on serverless cold starts and is not shared across function instances.

---

## 8. CORS & Security Headers

Defined in `functions/lib/shared-utils.ts`:

```typescript
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://chorebuddyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

Origin is locked to the production domain. All backend functions handle `OPTIONS` preflight requests.

---

## 9. Security Strengths

1. **Centralized security utilities** — all 14 backend functions import from `shared-utils.ts`
2. **Defense in depth** — layered checks: auth → role → family validation → entity ownership
3. **Entity whitelist** — `parentCrud.ts` restricts which entities can be operated on
4. **Server-enforced scoping** — `family_id` and `created_by` set server-side on create
5. **Completed security audit** — all 12 original functions audited (Feb 2026), all issues resolved
6. **CORS restriction** — single production origin

---

## 10. Areas for Future Improvement

1. **No database-level RLS** — all access control is application-level; mitigated by Base44 managing direct DB access, but a defense-in-depth gap
2. **Ephemeral rate limiting** — in-memory store resets on cold starts, not distributed across instances
3. **Duplicate role logic** — `isParent()` implemented separately in frontend and backend with slightly different field lookups
4. **No persistent audit logging** — sensitive operations (role changes, account linking, deletions) lack an audit trail
5. **Deprecated `sanitizeInput()`** — still exported with a 10,000 char limit; prefer `sanitizeString()` (500 char default)

---

## Key File References

| File | Purpose |
|------|---------|
| `functions/lib/shared-utils.ts` | Centralized backend security utilities |
| `src/utils/roles.js` | Frontend role definitions and helpers |
| `src/lib/AuthContext.jsx` | Authentication context provider |
| `src/api/base44Client.js` | Base44 client configuration |
| `src/constants/subscriptionTiers.js` | Subscription tier definitions |
| `src/components/hooks/useSubscriptionAccess.jsx` | Frontend subscription access hook |
| `src/components/ui/FeatureGate.jsx` | Frontend feature gating component |
| `src/constants/publicPages.js` | Public page allowlist |
| `functions/parentCrud.ts` | Exemplar backend authorization pattern |
| `functions/SECURITY_AUDIT.md.ts` | Prior security audit report |
