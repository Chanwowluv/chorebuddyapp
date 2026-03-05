# Subscription Tiers

## Tiers

| Tier | Family Members | Chores | Reward Items |
|------|---------------|--------|--------------|
| Free | 2 | 10 | 5 |
| Premium | 4 | Unlimited | Unlimited |
| Family Plus | Unlimited | Unlimited | Unlimited |

## Features by Tier

| Feature | Free | Premium | Family Plus |
|---------|------|---------|-------------|
| ChoreAI Smart Assignment | - | Yes | Yes |
| Advanced Chore Settings | - | Yes | Yes |
| Recurring Chores | - | Yes | Yes |
| Chore Approval System | - | Yes | Yes |
| Photo Verification | - | Yes | Yes |
| Custom Points | - | Yes | Yes |
| Priority Assignment | - | Yes | Yes |
| Early Completion Bonus | - | Yes | Yes |
| Family Invitations | - | Yes | Yes |
| Family Goals | - | - | Yes |
| Analytics & Reports | - | - | Yes |
| Weekly Reports | - | - | Yes |
| Premium Support | - | - | Yes |

## Notes

- **Family Plus** includes all features and unlimited family members.
- Frontend source of truth: `src/constants/subscriptionTiers.js`
- Backend source of truth: `functions/lib/shared-utils.ts`
- A value of `-1` represents "unlimited" for numeric limits.
