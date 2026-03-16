/**
 * Navigation utility - replaces @/utils createPageUrl to avoid
 * pulling in the broken src/utils/roles.js barrel export.
 */
export function createPageUrl(pageName) {
  return `/${pageName}`;
}