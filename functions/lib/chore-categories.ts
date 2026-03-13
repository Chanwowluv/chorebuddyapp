export const CHORE_CATEGORIES = [
  "kitchen",
  "bathroom",
  "bedroom",
  "laundry",
  "outdoor",
  "pets",
  "dishes",
  "vacuuming",
  "organizing",
  "trash",
  "cooking",
  "grocery",
  "general"
] as const;

export type ChoreCategory = typeof CHORE_CATEGORIES[number];

export function validateCategories(categories: string[]): void {
  if (!Array.isArray(categories)) return;
  
  const invalid = categories.filter(c => !CHORE_CATEGORIES.includes(c as any));
  if (invalid.length > 0) {
    throw new Error(`INVALID_CATEGORY: Invalid categories provided: ${invalid.join(', ')}. Valid options are: ${CHORE_CATEGORIES.join(', ')}`);
  }
}