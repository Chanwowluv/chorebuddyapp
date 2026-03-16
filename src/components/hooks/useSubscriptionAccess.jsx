import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { SUBSCRIPTION_FEATURES, formatTier } from '@/constants/subscriptionTiers';

export const useSubscriptionAccess = () => {
  const { user, people, items, chores } = useData();

  const currentTier = user?.subscription_tier || 'free';
  const isActive = user?.subscription_status === 'active' || currentTier === 'free';

  const features = useMemo(() => {
    return SUBSCRIPTION_FEATURES[currentTier] || SUBSCRIPTION_FEATURES.free;
  }, [currentTier]);

  // Check if user can access a specific feature
  const canAccess = (featureName) => {
    if (!isActive && currentTier !== 'free') return false;
    return features[featureName] || false;
  };

  // Check if user has reached a limit
  const hasReachedLimit = (limitType) => {
    const limit = features[limitType];
    if (limit === -1) return false; // Unlimited

    switch (limitType) {
      case 'max_family_members':
        return people.length >= limit;
      case 'max_redeemable_items':
        return items.length >= limit;
      case 'max_chores':
        return chores.length >= limit;
      default:
        return false;
    }
  };

  // Get the required tier for a feature
  const getRequiredTier = (featureName) => {
    for (const [tier, tierFeatures] of Object.entries(SUBSCRIPTION_FEATURES)) {
      if (tierFeatures[featureName]) {
        return tier;
      }
    }
    return 'premium'; // Default to premium if not found
  };

  const getTierDisplayName = formatTier;

  const isPaidTier = currentTier !== 'free' && isActive;

  return {
    currentTier,
    isActive,
    features,
    canAccess,
    hasReachedLimit,
    getRequiredTier,
    getTierDisplayName,
    // Convenience getters
    isPremium: currentTier === 'premium' && isActive,
    isFamilyPlus: currentTier === 'family_plus' && isActive,
    isPaidTier,
    isFree: currentTier === 'free'
  };
};

export default useSubscriptionAccess;
