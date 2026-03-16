import { describe, it, expect } from 'vitest';
import { FAMILY_ROLES, isParent, isChild } from '../roles';

describe('FAMILY_ROLES', () => {
  it('should define all role constants', () => {
    expect(FAMILY_ROLES.PARENT).toBe('parent');
    expect(FAMILY_ROLES.TEEN).toBe('teen');
    expect(FAMILY_ROLES.CHILD).toBe('child');
    expect(FAMILY_ROLES.TODDLER).toBe('toddler');
  });
});

describe('isParent', () => {
  it('should return true for parent role', () => {
    expect(isParent({ family_role: 'parent' })).toBe(true);
  });

  it('should return true for admin role', () => {
    expect(isParent({ role: 'admin' })).toBe(true);
  });

  it('should return true when user has both admin role and parent family_role', () => {
    expect(isParent({ role: 'admin', family_role: 'parent' })).toBe(true);
  });

  it('should return false for child role', () => {
    expect(isParent({ family_role: 'child' })).toBe(false);
  });

  it('should return false for teen role', () => {
    expect(isParent({ family_role: 'teen' })).toBe(false);
  });

  it('should return false for toddler role', () => {
    expect(isParent({ family_role: 'toddler' })).toBe(false);
  });

  it('should return false for null/undefined user', () => {
    expect(isParent(null)).toBe(false);
    expect(isParent(undefined)).toBe(false);
  });

  it('should return false for user with no role fields', () => {
    expect(isParent({})).toBe(false);
  });
});

describe('isChild', () => {
  it('should return true for child role', () => {
    expect(isChild({ family_role: 'child' })).toBe(true);
  });

  it('should return true for teen role', () => {
    expect(isChild({ family_role: 'teen' })).toBe(true);
  });

  it('should return true for toddler role', () => {
    expect(isChild({ family_role: 'toddler' })).toBe(true);
  });

  it('should return false for parent role', () => {
    expect(isChild({ family_role: 'parent' })).toBe(false);
  });

  it('should return false for null/undefined user', () => {
    expect(isChild(null)).toBe(false);
    expect(isChild(undefined)).toBe(false);
  });
});
