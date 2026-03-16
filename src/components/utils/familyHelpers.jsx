/**
 * Family management helper utilities
 * Used for permission checks, member limits, and subscription tier management
 */

export { getMemberLimit, hasReachedMemberLimit, getRemainingSlots, formatTier } from '@/constants/subscriptionTiers';

/**
 * Check if user can manage family (owner or co-owner)
 */
export function canManageFamily(user, family) {
  if (!user || !family) return false;

  const isOwner = family.owner_user_id === user.id;
  const isCoOwner = family.co_owners?.includes(user.id);

  return isOwner || isCoOwner;
}

/**
 * Check if user is the family owner
 */
export function isFamilyOwner(user, family) {
  if (!user || !family) return false;
  return family.owner_user_id === user.id;
}
