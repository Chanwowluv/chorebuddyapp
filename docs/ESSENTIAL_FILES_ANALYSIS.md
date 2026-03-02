# ChoreBuddy App — Essential Files & Folders Analysis

## App Stack Summary
- **Frontend:** React 18, Vite, TypeScript (for functions), Tailwind CSS, Radix UI / shadcn
- **Backend:** Base44 BaaS + 15 Deno serverless functions
- **Auth:** Base44 SDK token-based authentication
- **State:** React Context + React Query
- **Payments:** Stripe
- **Notifications:** Gmail / email, push

---

## ESSENTIAL FILES & FOLDERS — Must Keep for App to Function

### Root Config Files (All Critical)

| File | Purpose |
|------|---------|
| `package.json` | All dependencies and npm scripts — app won't build without this |
| `package-lock.json` | Locks exact dependency versions — reproducible builds |
| `index.html` | App HTML shell — Vite's root document |
| `vite.config.js` | Build and dev server configuration |
| `tailwind.config.js` | Tailwind CSS theming and design tokens |
| `postcss.config.js` | PostCSS pipeline required by Tailwind |
| `jsconfig.json` | Path aliases (`@/*` → `./src/*`) — imports break without this |
| `components.json` | Radix/shadcn UI component configuration |
| `.gitignore` | Prevents committing secrets and build artifacts |

### Root-Level Folders

| Folder | Purpose |
|--------|---------|
| `src/` | **All frontend source code — entire app UI lives here** |
| `functions/` | **All serverless backend logic — features won't work without these** |

---

## `src/` — Frontend Source (Keep Entire Folder)

### Core App Files

| File | Feature Supported |
|------|------------------|
| `src/main.jsx` | App entry point — mounts React root |
| `src/App.jsx` | Router setup — all page navigation |
| `src/Layout.jsx` | Navigation sidebar/header for all authenticated pages |
| `src/index.css` | Global styles and Tailwind base imports |
| `src/pages.config.js` | Auto-generated routing config — all 30 pages registered here |

### `src/api/`

| File | Feature Supported |
|------|------------------|
| `src/api/base44Client.js` | Base44 SDK initialization — **all API calls depend on this** |

### `src/lib/` — Core Libraries

| File | Feature Supported |
|------|------------------|
| `src/lib/AuthContext.jsx` | Authentication provider — login, session, user state |
| `src/lib/app-params.js` | Environment config (app ID, base URL, token) |
| `src/lib/query-client.js` | React Query client — all server state management |
| `src/lib/utils.js` | Utility functions (cn class merging) used everywhere |
| `src/lib/NavigationTracker.jsx` | Navigation tracking for analytics/UX |
| `src/lib/PageNotFound.jsx` | 404 error page |

### `src/constants/`

| File | Feature Supported |
|------|------------------|
| `src/constants/publicPages.js` | Pages that don't require auth — routing guard depends on this |
| `src/constants/subscriptionTiers.js` | Tier limits and feature flags — subscription gating throughout app |

### `src/hooks/` — Business Logic Hooks

| File | Feature Supported |
|------|------------------|
| `src/hooks/use-mobile.jsx` | Responsive layout detection |
| `src/hooks/archiveFamilyData.js` | Family data archiving |
| `src/hooks/checkMembersRemoved.js` | Member removal sync logic |
| `src/hooks/generateInviteCode.js` | Family invite code generation |
| `src/hooks/initializeFamilyMembers.js` | New family member setup |
| `src/hooks/initializeTrialPeriod.js` | Free trial initialization |
| `src/hooks/syncMemberCount.js` | Family member count syncing |
| `src/hooks/validateSubscriptionChange.js` | Subscription change validation |

### `src/utils/`

| File | Feature Supported |
|------|------------------|
| `src/utils/roles.js` | Role checking (parent/teen/child) — drives permissions throughout app |
| `src/utils/entityHelpers.js` | Data manipulation helpers for entities |
| `src/utils/index.ts` | Utils entry point |

### `src/pages/` — All 30 Page Components (All Essential)

| File | Feature |
|------|---------|
| `src/pages/Dashboard.jsx` | Main dashboard — weekly chore assignments & completions |
| `src/pages/Chores.jsx` | Chore CRUD — create, edit, delete chores |
| `src/pages/People.jsx` | Family member management |
| `src/pages/Schedule.jsx` | Calendar/schedule view of chores |
| `src/pages/ChoreHistory.jsx` | History of completed chores |
| `src/pages/Store.jsx` | Rewards store — redeem points |
| `src/pages/Goals.jsx` | Family goal tracking |
| `src/pages/Analytics.jsx` | Completion analytics and reports |
| `src/pages/Achievements.jsx` | Gamification badges/milestones |
| `src/pages/Challenges.jsx` | Time-limited team challenges |
| `src/pages/ApprovalQueue.jsx` | Parent chore approval workflow |
| `src/pages/FamilyLinking.jsx` | Invite and link family members |
| `src/pages/Messages.jsx` | Family messaging |
| `src/pages/NoticeBoard.jsx` | Family notice board |
| `src/pages/Admin.jsx` | Admin controls panel |
| `src/pages/Account.jsx` | User profile and settings |
| `src/pages/FamilyCalendar.jsx` | Family-wide calendar |
| `src/pages/LeaderboardHistory.jsx` | Historical leaderboards |
| `src/pages/ChoreTrades.jsx` | Chore trading between members |
| `src/pages/Templates.jsx` | Chore template library |
| `src/pages/PhotoGallery.jsx` | Photo documentation of chore completions |
| `src/pages/Pricing.jsx` | Subscription pricing page (public) |
| `src/pages/Home.jsx` | Landing/marketing home page (public) |
| `src/pages/Index.jsx` | Index/redirect page (public) |
| `src/pages/Help.jsx` | Help/FAQ page (public) |
| `src/pages/Privacy.jsx` | Privacy policy page (public) |
| `src/pages/JoinFamily.jsx` | Join family via invite link (public) |
| `src/pages/RoleSelection.jsx` | Role selection on signup (public) |
| `src/pages/PaymentSuccess.jsx` | Stripe payment success callback |
| `src/pages/PaymentCancel.jsx` | Stripe payment cancel callback |

### `src/components/` — Feature Component Folders (All Essential)

#### Core / Shared Components

| File | Feature |
|------|---------|
| `src/components/UserNotRegisteredError.jsx` | Error state when user is not registered |
| `src/components/utils.jsx` | Shared component utilities |
| `src/components/contexts/DataContext.jsx` | **Central data provider — loads all entities for the whole app** |
| `src/components/contexts/ThemeContext.jsx` | Dark/light theme state |

#### `src/components/ui/` — Base UI Primitives (All Essential)

All 40+ files in this folder provide the fundamental UI building blocks used throughout every page and feature. These include: `accordion`, `alert-dialog`, `alert`, `avatar`, `badge`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `input`, `label`, `pagination`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `tooltip`.

Plus custom UI: `Confetti.jsx`, `ConfirmDialog.jsx`, `CookieBanner.jsx`, `ErrorBoundary.jsx`, `ErrorBoundaryWithRetry.jsx`, `FeatureGate.jsx`, `InteractiveCheckbox.jsx`, `LimitReachedModal.jsx`, `LoadingSpinner.jsx`, `OfflineIndicator.jsx`, `RealTimeBadge.jsx`, `SkeletonLoader.jsx`, `SyncIndicator.jsx`, `UpgradeModal.jsx`.

#### Feature Component Folders

| Folder | Feature Supported |
|--------|------------------|
| `src/components/chores/` | Chore management UI — cards, modals, recurrence, rotation, subtasks, photo, voice notes, difficulty |
| `src/components/dashboard/` | Dashboard widgets — stats, progress, quick actions, parent analytics |
| `src/components/analytics/` | Analytics charts, stats, leaderboard cards, performance charts |
| `src/components/people/` | People/member UI — person cards, invite modal, link account, absence modal |
| `src/components/family/` | Family settings, chore reactions |
| `src/components/store/` | Reward store UI — item cards, redemption modals |
| `src/components/goals/` | Goal cards and creation modal |
| `src/components/gamification/` | Achievement badges, unlock modals, points display, confetti animations |
| `src/components/challenges/` | Challenge cards and creation modal |
| `src/components/schedule/` | Calendar view, day detail panel, schedule items |
| `src/components/ai/` | AI chore advisor modal and integration |
| `src/components/admin/` | Admin assignment preview and bulk import |
| `src/components/onboarding/` | Setup wizard and onboarding tour |
| `src/components/notifications/` | Notification manager |
| `src/components/profile/` | Avatar selector, theme selector, notification preferences, accessibility settings |
| `src/components/pricing/` | Pricing plan cards |
| `src/components/landing/` | Landing page feature cards and step cards |
| `src/components/layout/` | Public layout wrapper |
| `src/components/export/` | Export/PDF functionality |
| `src/components/templates/` | Chore template library |
| `src/components/trades/` | Chore trade cards |

#### Utilities Inside `src/components/`

| Folder | Feature |
|--------|---------|
| `src/components/hooks/` | Custom hooks: analytics data, assignment notifications, chore management, offline sync, online status, real-time sync, subscription access |
| `src/components/lib/` | App constants, points calculator, sanitization helpers |
| `src/components/utils/` | Cookies, entity helpers, error handler, family helpers, offline storage, validation |

---

## `functions/` — Serverless Backend (Keep Entire Folder)

### Main Function Files

| File | Feature |
|------|---------|
| `functions/aiChoreAdvisor.ts` | AI-powered chore suggestions |
| `functions/smartAssignChores.ts` | Automated weekly chore assignment (Premium+) |
| `functions/parentCrud.ts` | Secure CRUD for entities — parents only |
| `functions/inviteFamilyMember.ts` | Email invites to join family |
| `functions/joinFamily.ts` | Process family join via invite code |
| `functions/familyLinking.ts` | Generate and validate linking codes |
| `functions/linkAccount.ts` | Link user accounts across devices |
| `functions/learnChoreDifficulty.ts` | ML feedback loop for chore difficulty |
| `functions/generateReport.ts` | Analytics report generation (Family Plus+) |
| `functions/processRecurringChores.ts` | Cron: auto-create recurring chore assignments |
| `functions/sendChoreNotifications.ts` | Push/email chore reminders |
| `functions/sendNotifications.ts` | General notification dispatcher |
| `functions/sendGmailNotification.ts` | Gmail email sending |
| `functions/weeklyDigest.ts` | Cron: weekly family email digest |
| `functions/stripeCheckout.ts` | Stripe subscription checkout |

### Shared Backend Libraries

| File | Feature |
|------|---------|
| `functions/lib/shared-utils.ts` | **Auth, authorization, validation — all functions depend on this** |
| `functions/lib/choreAssignment.ts` | Core chore assignment algorithm |

---

## Optional But Recommended to Keep

### Developer Tooling

| File | Purpose |
|------|---------|
| `eslint.config.js` | Code linting rules |
| `.prettierrc` | Code formatting config |
| `.prettierignore` | Formatting exclusions |
| `.husky/pre-commit` | Pre-commit lint/format hooks |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Setup and usage instructions |
| `docs/SECURITY_ARCHITECTURE.md` | Security design decisions |
| `docs/SUBSCRIPTION_TIERS.md` | Subscription tier feature reference |
| `docs/api-examples.js` | API usage examples for development |

### Tests (Keep for Code Reliability)

| File | Purpose |
|------|---------|
| `functions/lib/__tests__/choreAssignment.test.ts` | Backend unit tests |
| `src/components/contexts/__tests__/DataContext.test.jsx` | Frontend context tests |
| `src/constants/__tests__/publicPages.test.js` | Constants tests |
| `src/constants/__tests__/subscriptionTiers.test.js` | Subscription tier tests |
| `src/utils/__tests__/roles.test.js` | Roles utility tests |
| `src/test/setup.js` | Test environment setup |
| `src/test/stubs/entity.js` | Test stubs |
| `src/test/stubs/entityHelpers.js` | Test helper stubs |

---

## File That Can Be Safely Removed

| File | Reason |
|------|--------|
| `functions/SECURITY_AUDIT.md.ts` | Misnamed — markdown document saved with `.ts` extension; not executable code |

> The `.git/` folder is managed by Git — do not touch or delete it manually.

---

## Complete Folder Structure

```
chorebuddyapp/
├── index.html                        ← KEEP
├── package.json                      ← KEEP
├── package-lock.json                 ← KEEP
├── vite.config.js                    ← KEEP
├── tailwind.config.js                ← KEEP
├── postcss.config.js                 ← KEEP
├── jsconfig.json                     ← KEEP
├── components.json                   ← KEEP
├── eslint.config.js                  ← KEEP
├── .gitignore                        ← KEEP
├── .prettierrc                       ← KEEP
├── .prettierignore                   ← KEEP
├── .husky/
│   └── pre-commit                    ← KEEP
├── README.md                         ← KEEP
│
├── docs/                             ← KEEP
│   ├── SECURITY_ARCHITECTURE.md
│   ├── SUBSCRIPTION_TIERS.md
│   └── api-examples.js
│
├── functions/                        ← KEEP ENTIRE FOLDER
│   ├── aiChoreAdvisor.ts
│   ├── familyLinking.ts
│   ├── generateReport.ts
│   ├── inviteFamilyMember.ts
│   ├── joinFamily.ts
│   ├── learnChoreDifficulty.ts
│   ├── linkAccount.ts
│   ├── parentCrud.ts
│   ├── processRecurringChores.ts
│   ├── sendChoreNotifications.ts
│   ├── sendGmailNotification.ts
│   ├── sendNotifications.ts
│   ├── smartAssignChores.ts
│   ├── stripeCheckout.ts
│   ├── weeklyDigest.ts
│   ├── SECURITY_AUDIT.md.ts          ← CAN REMOVE (not real code)
│   └── lib/
│       ├── shared-utils.ts           ← KEEP (critical shared lib)
│       ├── choreAssignment.ts        ← KEEP
│       └── __tests__/
│           └── choreAssignment.test.ts ← KEEP
│
└── src/                              ← KEEP ENTIRE FOLDER
    ├── main.jsx
    ├── App.jsx
    ├── Layout.jsx
    ├── index.css
    ├── pages.config.js
    ├── api/
    │   └── base44Client.js
    ├── lib/
    │   ├── AuthContext.jsx
    │   ├── NavigationTracker.jsx
    │   ├── PageNotFound.jsx
    │   ├── app-params.js
    │   ├── query-client.js
    │   └── utils.js
    ├── constants/
    │   ├── publicPages.js
    │   ├── subscriptionTiers.js
    │   └── __tests__/
    ├── hooks/
    │   ├── use-mobile.jsx
    │   ├── archiveFamilyData.js
    │   ├── checkMembersRemoved.js
    │   ├── generateInviteCode.js
    │   ├── initializeFamilyMembers.js
    │   ├── initializeTrialPeriod.js
    │   ├── syncMemberCount.js
    │   └── validateSubscriptionChange.js
    ├── utils/
    │   ├── roles.js
    │   ├── entityHelpers.js
    │   ├── index.ts
    │   └── __tests__/
    ├── test/
    │   ├── setup.js
    │   └── stubs/
    ├── pages/               (30 page files — all keep)
    └── components/
        ├── UserNotRegisteredError.jsx
        ├── utils.jsx
        ├── ui/              (40+ UI primitives — all keep)
        ├── contexts/        (DataContext + ThemeContext)
        ├── chores/          (15 files)
        ├── dashboard/       (10 files)
        ├── analytics/       (7 files)
        ├── people/          (6 files)
        ├── family/          (2 files)
        ├── store/           (3 files)
        ├── goals/           (2 files)
        ├── gamification/    (5 files)
        ├── challenges/      (2 files)
        ├── schedule/        (3 files)
        ├── ai/              (2 files)
        ├── admin/           (2 files)
        ├── onboarding/      (2 files)
        ├── notifications/   (1 file)
        ├── profile/         (6 files)
        ├── pricing/         (1 file)
        ├── landing/         (2 files)
        ├── layout/          (1 file)
        ├── export/          (1 file)
        ├── templates/       (1 file)
        ├── trades/          (1 file)
        ├── hooks/           (7 custom hooks)
        ├── lib/             (3 files)
        └── utils/           (6 files)
```

---

## Verification Checklist
- `npm install` → completes with no errors
- `npm run dev` → app starts on localhost
- All 30 routes load without errors in browser
- Auth flow works (unauthenticated → login redirect, authenticated → dashboard)
- Subscription gating shows correct limits per tier
- A serverless function endpoint (e.g., `parentCrud`) responds correctly
- Recurring chore processing, AI advisor, and notifications all functional
