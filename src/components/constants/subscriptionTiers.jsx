/**
 * Subscription tier configuration and limits
 * Canonical source for all subscription-related constants
 */

export const SUBSCRIPTION_FEATURES = {
  free: {
    max_family_members: 2,
    max_redeemable_items: 5,
    max_chores: 10,
    chore_ai: false,
    recurring_chores: false,
    photo_verification: false,
    approval_system: false,
    custom_points: false,
    family_invitations: false,
    priority_assignment: false,
    early_completion_bonus: false,
    family_goals: false,
    challenges: false,
    advanced_analytics: false,
    weekly_reports: false,
    premium_support: false,
    multi_household: false,
  },
  premium: {
    max_family_members: 4,
    max_redeemable_items: -1, // unlimited
    max_chores: -1,
    chore_ai: true,
    recurring_chores: true,
    photo_verification: true,
    approval_system: true,
    custom_points: true,
    family_invitations: true,
    priority_assignment: true,
    early_completion_bonus: true,
    family_goals: false,
    challenges: false,
    advanced_analytics: false,
    weekly_reports: false,
    premium_support: false,
    multi_household: false,
  },
  family_plus: {
    max_family_members: -1, // unlimited
    max_redeemable_items: -1,
    max_chores: -1,
    chore_ai: true,
    recurring_chores: true,
    photo_verification: true,
    approval_system: true,
    custom_points: true,
    family_invitations: true,
    priority_assignment: true,
    early_completion_bonus: true,
    family_goals: true,
    challenges: true,
    advanced_analytics: true,
    weekly_reports: true,
    premium_support: true,
    multi_household: true,
  },
};

const TIER_LABELS = {
  free: "Free",
  premium: "Premium",
  family_plus: "Family Plus",
};

export function formatTier(tier) {
  return TIER_LABELS[tier] || tier;
}

export function getMemberLimit(tier) {
  const features = SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.free;
  return features.max_family_members;
}

export function hasReachedMemberLimit(tier, currentCount) {
  const limit = getMemberLimit(tier);
  if (limit === -1) return false;
  return currentCount >= limit;
}

export function getRemainingSlots(tier, currentCount) {
  const limit = getMemberLimit(tier);
  if (limit === -1) return Infinity;
  return Math.max(0, limit - currentCount);
}