/**
 * Subscription tier configuration — single source of truth.
 *
 * All tier limits, feature flags, and helper functions live here.
 * Do NOT define tier limits inline in other files; import from this module.
 *
 * Backend equivalent: functions/lib/shared-utils.ts (kept in sync manually).
 */

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  FAMILY_PLUS: 'family_plus'
};

export const SUBSCRIPTION_FEATURES = {
  free: {
    max_family_members: 2,
    max_redeemable_items: 5,
    max_chores: 10,

    choreai_smart_assignment: false,
    advanced_chore_settings: false,
    family_goals: false,
    analytics_export: false,
    premium_support: false,
    recurring_chores: false,
    chore_approval_system: false,
    photo_verification: false,
    custom_points: false,
    weekly_reports: false,
    priority_assignment: false,
    early_completion_bonus: false,
    family_invitations: false,
  },
  premium: {
    max_family_members: 4,
    max_redeemable_items: -1,
    max_chores: -1,

    choreai_smart_assignment: true,
    advanced_chore_settings: true,
    family_goals: false,
    analytics_export: false,
    premium_support: false,
    recurring_chores: true,
    chore_approval_system: true,
    photo_verification: true,
    custom_points: true,
    weekly_reports: false,
    priority_assignment: true,
    early_completion_bonus: true,
    family_invitations: true,
  },
  family_plus: {
    max_family_members: -1,
    max_redeemable_items: -1,
    max_chores: -1,

    choreai_smart_assignment: true,
    advanced_chore_settings: true,
    family_goals: true,
    analytics_export: true,
    premium_support: true,
    recurring_chores: true,
    chore_approval_system: true,
    photo_verification: true,
    custom_points: true,
    weekly_reports: true,
    priority_assignment: true,
    early_completion_bonus: true,
    family_invitations: true,
  },
}

/**
 * Get the max family member limit for a tier.
 */
export function getMemberLimit(tier) {
  const features = SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.free;
  return features.max_family_members;
}

/**
 * Get the max chores limit for a tier. Returns -1 for unlimited.
 */
export function getChoreLimit(tier) {
  const features = SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.free;
  return features.max_chores;
}

/**
 * Get the max redeemable items limit for a tier. Returns -1 for unlimited.
 */
export function getItemLimit(tier) {
  const features = SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.free;
  return features.max_redeemable_items;
}

/**
 * Check if a family has reached its member limit.
 */
export function hasReachedMemberLimit(family) {
  if (!family) return false;
  const limit = getMemberLimit(family.subscription_tier || 'free');
  if (limit === -1) return false; // unlimited
  const currentCount = family.member_count || 0;
  return currentCount >= limit;
}

/**
 * Get the number of remaining member slots for a family.
 */
export function getRemainingSlots(family) {
  if (!family) return 0;
  const limit = getMemberLimit(family.subscription_tier || 'free');
  if (limit === -1) return Infinity; // unlimited
  const currentCount = family.member_count || 0;
  return Math.max(0, limit - currentCount);
}

/**
 * Get display name for a subscription tier.
 */
export function formatTier(tier) {
  const names = {
    free: 'Free',
    premium: 'Premium',
    family_plus: 'Family Plus'
  };
  return names[tier] || 'Free';
}

/** Alias for formatTier. */
export const getTierDisplayName = formatTier;

/**
 * Get badge color for a subscription tier.
 */
export function getTierColor(tier) {
  const colors = {
    free: 'gray',
    premium: 'blue',
    family_plus: 'purple'
  };
  return colors[tier] || 'gray';
}