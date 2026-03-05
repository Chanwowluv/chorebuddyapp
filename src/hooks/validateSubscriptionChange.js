import { getMemberLimit, formatTier, SUBSCRIPTION_TIERS } from '@/constants/subscriptionTiers';

const VALID_TIERS = [SUBSCRIPTION_TIERS.FREE, SUBSCRIPTION_TIERS.PREMIUM, SUBSCRIPTION_TIERS.FAMILY_PLUS];

/**
 * Validate subscription tier changes.
 *
 * When a family exceeds the new tier's member limit, the change is blocked
 * and the error message presents three options:
 *   1. Upgrade to a higher tier
 *   2. Stay on the current tier
 *   3. Cancel subscription and use the default free tier (after removing excess members)
 */
export async function validateSubscriptionChange(data, existingData, context) {
  if (!data.subscription_tier) return data;

  const oldTier = existingData.subscription_tier;
  const newTier = data.subscription_tier;

  // Reject unknown tiers
  if (!VALID_TIERS.includes(newTier)) {
    throw new Error(
      `"${newTier}" is not a valid subscription tier. ` +
      `Valid tiers: ${VALID_TIERS.map(t => formatTier(t)).join(', ')}.`
    );
  }

  if (oldTier === newTier) return data;

  // Check member count limits for downgrade
  const memberCount = data.member_count || existingData.member_count || 0;
  const newLimit = getMemberLimit(newTier);

  if (newLimit !== -1 && memberCount > newLimit) {
    throw new Error(
      `Cannot switch to ${formatTier(newTier)}: You have ${memberCount} members ` +
      `but ${formatTier(newTier)} supports up to ${newLimit}. ` +
      `You can: (1) Upgrade to a higher tier, ` +
      `(2) Stay on your current ${formatTier(oldTier)} plan, or ` +
      `(3) Remove ${memberCount - newLimit} member(s) first, then switch.`
    );
  }

  // Log the change
  console.log(`Subscription changed: ${oldTier} -> ${newTier} for family ${existingData.id}`);

  return data;
}
