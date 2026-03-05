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
    for (const tier of ['premium', 'family_plus']) {
      const tierKeys = Object.keys(SUBSCRIPTION_FEATURES[tier]).sort();
      expect(tierKeys).toEqual(freeKeys);
    }
  });

  it('family_plus should have all features enabled', () => {
    const booleanFeatures = Object.entries(SUBSCRIPTION_FEATURES.family_plus)
      .filter(([key]) => !key.startsWith('max_'));
    for (const [key, value] of booleanFeatures) {
      expect(value).toBe(true);
    }
  });
});

describe('getMemberLimit', () => {
  it('should return 2 for free tier', () => {
    expect(getMemberLimit('free')).toBe(2);
  });

  it('should return 4 for premium tier', () => {
    expect(getMemberLimit('premium')).toBe(4);
  });

  it('should return 12 for family_plus tier', () => {
    expect(getMemberLimit('family_plus')).toBe(12);
  });

  it('should default to free tier for free tier', () => {
    expect(getMemberLimit('default')).toBe(2);
  });

  it('should default to free tier for undefined', () => {
    expect(getMemberLimit(undefined)).toBe(2);
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
    expect(formatTier('family_plus')).toBe('Family Plus')
  });

  it('should default to Free for free tier', () => {
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
    expect(getTierColor('family_plus')).toBe('purple')
  });

  it('should default to gray for unknown tier', () => {
    expect(getTierColor('unknown')).toBe('gray');
  });
});