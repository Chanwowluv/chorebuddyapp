# ChoreBuddy Role Reference Guide

## Role Hierarchy

```
owner (Family.owner_user_id)
  └── parent (family_role: 'parent')
        ├── teen (family_role: 'teen')
        └── child (family_role: 'child')
```

- **Owner**: The user who created the family. Stored as `Family.owner_user_id`. Cannot be transferred. Has all parent privileges plus family deletion rights.
- **Parent**: Full admin privileges within the family. Can manage chores, approve completions, invite members, view analytics.
- **Teen**: Can view assigned chores, complete them, earn rewards, view leaderboard.
- **Child**: Same privileges as teen.

## How Roles Are Assigned

| Role | Assignment Method | Can Self-Assign? |
|------|------------------|-----------------|
| `parent` | User selects "Parent" on RoleSelection page, which creates a new Family | Only at signup (creates family) |
| `teen` | Selected at signup, or assigned by parent when invited/joined | No (server-enforced on join flows) |
| `child` | Selected at signup, or assigned by parent when invited/joined | No (server-enforced on join flows) |
| `owner` | Automatically set to the user who creates a Family | No |

**Security invariant**: Parent role cannot be obtained by joining an existing family. It is only granted when a user creates a new family via the RoleSelection page.

## Permissions Matrix

| Action | Parent | Teen | Child |
|--------|--------|------|-------|
| **Family Management** | | | |
| Create family | Y | - | - |
| Invite members | Y | - | - |
| Generate linking code | Y | - | - |
| Remove members | Y | - | - |
| Change member roles | Y (teen/child only) | - | - |
| **Chore Management** | | | |
| Create chores | Y | - | - |
| Edit/delete chores | Y | - | - |
| Assign chores | Y | - | - |
| Complete assigned chores | Y | Y | Y |
| Submit chore for approval | - | Y | Y |
| Approve/reject chores | Y | - | - |
| **Rewards & Store** | | | |
| Create reward items | Y | - | - |
| Redeem points | Y | Y | Y |
| View points/badges | Y | Y | Y |
| **Analytics & Reports** | | | |
| View analytics dashboard | Y | - | - |
| Generate reports | Y (Family Plus) | - | - |
| **AI Features** | | | |
| Smart chore assignment | Y (Premium+) | - | - |
| AI chore advisor | Y | - | - |
| **Account** | | | |
| Link/unlink accounts | Y | - | - |
| Manage subscription | Y (owner only) | - | - |

## Frontend Route Visibility

| Route | Parent | Teen | Child | Public |
|-------|--------|------|-------|--------|
| Dashboard | Y | Y | Y | - |
| Family/People | Y | - | - | - |
| Chores | Y | Y | Y | - |
| Schedule/Calendar | Y | Y | Y | - |
| History | Y | Y | Y | - |
| Messages | Y | Y | Y | - |
| Store | Y | Y | Y | - |
| Goals | Y | Y | Y | - |
| Admin/Approval Queue | Y | - | - | - |
| Analytics | Y | - | - | - |
| Templates | Y | - | - | - |
| Home/Pricing/Help | Y | Y | Y | Y |

## Serverless Function Authorization

| Function | Auth Required | Role Required | Family Scoped |
|----------|:------------:|:-------------:|:-------------:|
| parentCrud | Y | parent | Y |
| approveChore | Y | parent | Y |
| inviteFamilyMember | Y | parent | Y |
| smartAssignChores | Y | parent + Premium | Y |
| generateReport | Y | parent + Family Plus | Y |
| processRecurringChores | Y | parent | Y |
| learnChoreDifficulty | Y | parent | Y |
| submitChore | Y | any (own chores only) | Y |
| joinFamily | Y | any | - |
| familyLinking | Y | parent (generate), any (join) | Y |
| linkAccount | Y | parent (parent_link) | Y |
| sendNotifications | API Key | - | - |
| stripeCheckout | Webhook sig | - | - |

## Security Checklist (Pre-Deployment)

- [ ] All serverless functions check `user.family_role` (not `user.role`) for parent verification
- [ ] All data-modifying functions verify `family_id` matches the caller's family
- [ ] Join flows (joinFamily, familyLinking) reject `role: 'parent'` in request body
- [ ] Role changes only go through `parentCrud` with `action: 'changeRole'`
- [ ] No direct client-side SDK calls modify `family_role` (except initial RoleSelection)
- [ ] Entity CRUD operations verify family ownership before allowing updates/deletes
- [ ] Rate limiting is active on invite and linking code generation endpoints

## How to Add a New Role

1. Add the role string to `VALID_ROLES` in `functions/lib/shared-utils.ts`
2. Add the role to `FAMILY_ROLES` in `src/utils/roles.js`
3. Update `isChild()` in `src/utils/roles.js` if the role is non-parent
4. Add the role to `ASSIGNABLE_ROLES` in `functions/parentCrud.ts` if parents can assign it
5. Update navigation visibility in `src/Layout.jsx`
6. Add the role option to `PersonFormModal.jsx`
7. Update this reference document
