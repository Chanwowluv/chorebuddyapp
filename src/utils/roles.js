/**
 * Centralized role constants and helpers.
 *
 * Use these instead of inline role checks like:
 *   user?.role === 'admin'
 *   user?.family_role === 'parent'
 *   user?.family_role === 'child' || user?.family_role === 'teen'
 */

export const FAMILY_ROLES = {
  PARENT: 'parent',
  TEEN: 'teen',
  CHILD: 'child',
  TODDLER: 'toddler',
};

/**
 * Check if user has parent/admin privileges.
 * This is the single source of truth — replaces all checks for:
 *   user?.role === 'admin'
 *   user?.family_role === 'parent'
 *   user?.role === 'admin' || user?.family_role === 'parent'
 */
export function isParent(user) {
  return user?.family_role === FAMILY_ROLES.PARENT || user?.role === 'admin' || user?.data?.family_role === FAMILY_ROLES.PARENT;
}

/**
 * Check if user is a child, teen, or toddler (non-parent family member).
 * Replaces inconsistent checks that sometimes missed 'teen' or 'toddler'.
 */
export function isChild(user) {
  return (
    user?.family_role === FAMILY_ROLES.CHILD ||
    user?.family_role === FAMILY_ROLES.TEEN ||
    user?.family_role === FAMILY_ROLES.TODDLER
  );
}
