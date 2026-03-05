import { describe, it, expect } from 'vitest';
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_FEATURES,
  getMemberLimit,
  getChoreLimit,
  getItemLimit,
  hasReachedMemberLimit,
  getRemainingSlots,
  formatTier,
  getTierDisplayName,
  getTierColor,
} from '../subscriptionTiers';

describe('SUBSCRIPTION_TIERS', () => {
  it('should define all four tiers', () => {
    expect(SUBSCRIPTION_TIERS.FREE).toBe('free');
    expect(SUBSCRIPTION_TIERS.PREMIUM).toBe('premium');
    expect(SUBSCRIPTION_TIERS.FAMILY_PLUS).toBe('family_plus');
  });
});

describe('SUBSCRIPTION_FEATURES', () => {
  it('should have exactly 4 tiers', () => {
    expect(Object.keys(SUBSCRIPTION_FEATURES)).toHaveLength(4);
  });

  it('all tiers should have the same set of keys', () => {
    const freeKeys = Object.keys(SUBSCRIPTION_FEATURES.free).sort();
    for (const tier of ['premium', 'family_plus', 'enterprise']) {
      const tierKeys = Object.keys(SUBSCRIPTION_FEATURES[tier]).sort();
      expect(tierKeys).toEqual(freeKeys);
    }
  });

  it('enterprise should have all features enabled', () => {
    const booleanFeatures = Object.entries(SUBSCRIPTION_FEATURES.enterprise)
      .filter(([key]) => !key.startsWith('max_'));
    for (const [key, value] of booleanFeatures) {
      expect(value).toBe(true);
    }
  });
});

describe('getMemberLimit', () => {
  it('should return 6 for free tier', () => {
    expect(getMemberLimit('free')).toBe(6);
  });

  it('should return 15 for premium tier', () => {
    expect(getMemberLimit('premium')).toBe(15);
  });

  it('should return 30 for family_plus tier', () => {
    expect(getMemberLimit('family_plus')).toBe(30);
  });

  it('should return 50 for enterprise tier', () => {
    expect(getMemberLimit('enterprise')).toBe(50);
  });

  it('should default to free tier for unknown tier', () => {
    expect(getMemberLimit('nonexistent')).toBe(6);
  });

  it('should default to free tier for undefined', () => {
    expect(getMemberLimit(undefined)).toBe(6);
  });
});

describe('getChoreLimit', () => {
  it('should return 10 for free tier', () => {
    expect(getChoreLimit('free')).toBe(10);
  });

  it('should return -1 (unlimited) for premium tier', () => {
    expect(getChoreLimit('premium')).toBe(-1);
  });
});

describe('getItemLimit', () => {
  it('should return 5 for free tier', () => {
    expect(getItemLimit('free')).toBe(5);
  });

  it('should return -1 (unlimited) for premium tier', () => {
    expect(getItemLimit('premium')).toBe(-1);
  });
});

describe('formatTier / getTierDisplayName', () => {
  it('should format each tier correctly', () => {
    expect(formatTier('free')).toBe('Free');
    expect(formatTier('premium')).toBe('Premium');
    expect(formatTier('family_plus')).toBe('Family Plus');
    expect(formatTier('enterprise')).toBe('Enterprise');
  });

  it('should default to Free for unknown tier', () => {
    expect(formatTier('unknown')).toBe('Free');
    expect(formatTier(undefined)).toBe('Free');
  });

  it('getTierDisplayName should be an alias for formatTier', () => {
    expect(getTierDisplayName).toBe(formatTier);
  });
});

describe('getTierColor', () => {
  it('should return colors for each tier', () => {
    expect(getTierColor('free')).toBe('gray');
    expect(getTierColor('premium')).toBe('blue');
    expect(getTierColor('family_plus')).toBe('purple');
    expect(getTierColor('enterprise')).toBe('yellow');
  });

  it('should default to gray for unknown tier', () => {
    expect(getTierColor('unknown')).toBe('gray');
  });
});

describe('hasReachedMemberLimit', () => {
  it('should return true when at limit', () => {
    const family = { subscription_tier: 'free', member_count: 6 };
    expect(hasReachedMemberLimit(family)).toBe(true);
  });

  it('should return true when over limit', () => {
    const family = { subscription_tier: 'free', member_count: 8 };
    expect(hasReachedMemberLimit(family)).toBe(true);
  });

  it('should return false when under limit', () => {
    const family = { subscription_tier: 'free', member_count: 3 };
    expect(hasReachedMemberLimit(family)).toBe(false);
  });

  it('should return false for null family', () => {
    expect(hasReachedMemberLimit(null)).toBe(false);
  });

  it('should use member_count only, ignoring deprecated members array', () => {
    const family = { subscription_tier: 'free', members: ['a', 'b', 'c', 'd', 'e', 'f'] };
    // Without member_count, count defaults to 0 — stale members array is ignored
    expect(hasReachedMemberLimit(family)).toBe(false);
  });
});

describe('getRemainingSlots', () => {
  it('should return correct remaining slots', () => {
    const family = { subscription_tier: 'free', member_count: 4 };
    expect(getRemainingSlots(family)).toBe(2);
  });

  it('should return 0 when at limit', () => {
    const family = { subscription_tier: 'free', member_count: 6 };
    expect(getRemainingSlots(family)).toBe(0);
  });

  it('should return 0 when over limit', () => {
    const family = { subscription_tier: 'free', member_count: 10 };
    expect(getRemainingSlots(family)).toBe(0);
  });

  it('should return 0 for null family', () => {
    expect(getRemainingSlots(null)).toBe(0);
  });

  it('should respect premium tier limit', () => {
    const family = { subscription_tier: 'premium', member_count: 10 };
    expect(getRemainingSlots(family)).toBe(5);
  });
});
