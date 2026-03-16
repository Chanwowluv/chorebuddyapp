/**
 * Family role constants and helper functions.
 * Centralises role-checking logic so every consumer uses the same rules.
 */

export const FAMILY_ROLES = {
  PARENT: "parent",
  TEEN: "teen",
  CHILD: "child",
};

/**
 * Returns true when the user holds a "parent" family role.
 */
export function isParent(user) {
  return user?.family_role === FAMILY_ROLES.PARENT;
}

/**
 * Returns true when the user holds a non-parent family role (child or teen).
 */
export function isChild(user) {
  return (
    user?.family_role === FAMILY_ROLES.CHILD ||
    user?.family_role === FAMILY_ROLES.TEEN
  );
}