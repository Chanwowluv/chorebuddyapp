/**
 * Client-side family linking utilities.
 * Replaces the familyLinking, joinFamily, linkAccount, and inviteFamilyMember
 * serverless functions with direct Base44 entity operations.
 *
 * These functions run entirely on the client using `base44.entities.*` and
 * `base44.auth.*`.  Base44 RLS provides server-side access control.
 */

import { base44 } from '@/api/base44Client';

// ─── Constants ────────────────────────────────────────────────────────────────

const CODE_EXPIRY_HOURS = 48;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

const TIER_LIMITS = {
  free: 4,
  premium: 10,
  family: 20,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(length = CODE_LENGTH) {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

function calculateExpiryDate(hours = CODE_EXPIRY_HOURS) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function isExpired(dateStr) {
  return new Date(dateStr) < new Date();
}

function sanitizeCode(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, code: '', error: 'Code is required' };
  }
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6 || code.length > 12) {
    return { valid: false, code: '', error: 'Code must be between 6 and 12 characters' };
  }
  return { valid: true, code };
}

function normalizeRole(role) {
  const valid = ['parent', 'teen', 'child'];
  if (typeof role === 'string' && valid.includes(role.toLowerCase())) {
    return role.toLowerCase();
  }
  return 'child';
}

// ─── Generate Linking Code ────────────────────────────────────────────────────

/**
 * Generate (or regenerate) a family linking code.
 * Only parents should call this.
 *
 * @param {string} familyId - The family to generate a code for.
 * @returns {{ linkingCode: string, expiresAt: string }}
 */
export async function generateLinkingCode(familyId) {
  if (!familyId) throw new Error('Family ID is required');

  const newCode = generateCode();
  const expiresAt = calculateExpiryDate();

  await base44.entities.Family.update(familyId, {
    linking_code: newCode,
    linking_code_expires: expiresAt,
  });

  return { linkingCode: newCode, expiresAt };
}

// ─── Join Family by Linking Code ──────────────────────────────────────────────

/**
 * Join a family using a linking code.
 * Creates a Person record, updates Family members, and updates the current user.
 *
 * @param {{ linkingCode: string }} opts
 * @returns {{ familyName: string, familyId: string, personId: string }}
 */
export async function joinFamilyByCode({ linkingCode }) {
  const { valid, code, error: codeErr } = sanitizeCode(linkingCode);
  if (!valid) throw new Error(codeErr);

  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');

  if (user.family_id) {
    throw new Error('You are already in a family. Leave your current family first.');
  }

  // Try to find family by linking_code
  let families;
  try {
    families = await base44.entities.Family.filter({ linking_code: code });
  } catch {
    throw new Error('Failed to validate linking code. Please try again.');
  }

  if (!families || families.length === 0) {
    throw new Error('Invalid linking code. Please check and try again.');
  }

  const family = families[0];

  if (family.linking_code_expires && isExpired(family.linking_code_expires)) {
    throw new Error('This linking code has expired. Ask your parent for a new code.');
  }

  // Check member limit
  const currentMembers = family.members || [];
  const tier = family.subscription_tier || family.tier || 'free';
  const maxMembers = family.max_members || TIER_LIMITS[tier] || TIER_LIMITS.free;

  if (currentMembers.length >= maxMembers) {
    throw new Error(
      `This family has reached its ${tier} plan limit of ${maxMembers} members. The family owner needs to upgrade.`
    );
  }

  if (currentMembers.includes(user.id)) {
    throw new Error('You are already a member of this family.');
  }

  // Create Person record
  const newPerson = await base44.entities.Person.create({
    name: user.full_name || user.email || 'Family Member',
    family_id: family.id,
    linked_user_id: user.id,
    role: normalizeRole(user.family_role),
    is_active: true,
    points_balance: 0,
    total_points_earned: 0,
    chores_completed_count: 0,
    current_streak: 0,
    best_streak: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Update Family members
  const updatedMembers = [...currentMembers, user.id];
  try {
    await base44.entities.Family.update(family.id, {
      members: updatedMembers,
      member_count: updatedMembers.length,
    });
  } catch (err) {
    // Rollback: delete the person we just created
    try { await base44.entities.Person.delete(newPerson.id); } catch { /* best effort */ }
    throw new Error('Failed to join family. Please try again.');
  }

  // Update user
  try {
    await base44.auth.updateMe({
      family_id: family.id,
      linked_person_id: newPerson.id,
    });
  } catch (err) {
    // Rollback
    try { await base44.entities.Person.delete(newPerson.id); } catch { /* best effort */ }
    try {
      await base44.entities.Family.update(family.id, {
        members: currentMembers,
        member_count: currentMembers.length,
      });
    } catch { /* best effort */ }
    throw new Error('Failed to complete family join. Please try again.');
  }

  return {
    familyName: family.name,
    familyId: family.id,
    personId: newPerson.id,
  };
}

// ─── Join Family by Invite Code (email flow) ─────────────────────────────────

/**
 * Join a family using an invite code (from email invitation).
 *
 * @param {{ inviteCode: string, email: string, name: string, role?: string }} opts
 * @returns {{ familyName: string, familyId: string, personId: string }}
 */
export async function joinFamilyByInviteCode({ inviteCode, email, name, role }) {
  const { valid, code, error: codeErr } = sanitizeCode(inviteCode);
  if (!valid) throw new Error(codeErr);

  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');

  // Try to find family by invite_code
  let families;
  try {
    families = await base44.entities.Family.filter({ invite_code: code });
  } catch {
    // Fallback: try linking_code
    try {
      families = await base44.entities.Family.filter({ linking_code: code });
    } catch {
      throw new Error('Failed to validate invite code.');
    }
  }

  if (!families || families.length === 0) {
    throw new Error('Invalid invite code. Please check your email for the correct link.');
  }

  const family = families[0];

  // Check member limit
  const currentMembers = family.members || [];
  const tier = family.subscription_tier || family.tier || 'free';
  const maxMembers = family.max_members || TIER_LIMITS[tier] || TIER_LIMITS.free;

  if (currentMembers.includes(user.id)) {
    return { familyName: family.name, familyId: family.id, alreadyMember: true };
  }

  if (user.family_id && user.family_id !== family.id) {
    throw new Error('You are already in a different family. Leave your current family first.');
  }

  if (currentMembers.length >= maxMembers) {
    throw new Error(
      `This family has reached its plan's member limit. The family owner needs to upgrade.`
    );
  }

  // Create Person
  const newPerson = await base44.entities.Person.create({
    name: name || user.full_name || user.email || 'Family Member',
    family_id: family.id,
    linked_user_id: user.id,
    role: normalizeRole(role),
    is_active: true,
    points_balance: 0,
    total_points_earned: 0,
    chores_completed_count: 0,
    current_streak: 0,
    best_streak: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Update Family
  const updatedMembers = [...currentMembers, user.id];
  try {
    await base44.entities.Family.update(family.id, {
      members: updatedMembers,
      member_count: updatedMembers.length,
    });
  } catch {
    try { await base44.entities.Person.delete(newPerson.id); } catch { /* best effort */ }
    throw new Error('Failed to join family. Please try again.');
  }

  // Update user
  try {
    await base44.auth.updateMe({
      family_id: family.id,
      linked_person_id: newPerson.id,
    });
  } catch {
    try { await base44.entities.Person.delete(newPerson.id); } catch { /* best effort */ }
    try {
      await base44.entities.Family.update(family.id, {
        members: currentMembers,
        member_count: currentMembers.length,
      });
    } catch { /* best effort */ }
    throw new Error('Failed to complete family join. Please try again.');
  }

  return { familyName: family.name, familyId: family.id, personId: newPerson.id };
}

// ─── Unlink Account ───────────────────────────────────────────────────────────

/**
 * Unlink a user account from a Person profile.
 * Only parents should call this.
 *
 * @param {string} personId
 */
export async function unlinkAccount(personId) {
  if (!personId) throw new Error('Person ID is required');

  const person = await base44.entities.Person.get(personId);
  if (!person) throw new Error('Person not found');

  await base44.entities.Person.update(personId, {
    linked_user_id: null,
    updated_at: new Date().toISOString(),
  });

  return { personId };
}

// ─── Link Account (Parent-initiated) ─────────────────────────────────────────

/**
 * Link the current user's account to a Person profile (parent-initiated).
 *
 * @param {string} personId
 */
export async function linkAccountToParent(personId) {
  if (!personId) throw new Error('Person ID is required');

  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');

  const person = await base44.entities.Person.get(personId);
  if (!person) throw new Error('Person not found');

  if (person.linked_user_id && person.linked_user_id !== user.id) {
    throw new Error('This family member is already linked to another account');
  }

  await base44.entities.Person.update(personId, {
    linked_user_id: user.id,
    updated_at: new Date().toISOString(),
  });

  await base44.auth.updateMe({ linked_person_id: personId });

  return { personId, personName: person.name };
}

// ─── Link Account by Code ─────────────────────────────────────────────────────

/**
 * Link account using a linking code (child/teen flow).
 *
 * @param {string} linkingCode
 * @returns {{ success: boolean, personId?: string, needsSelection?: boolean, unlinkedPeople?: Array }}
 */
export async function linkAccountByCode(linkingCode) {
  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');
  if (!user.family_id) throw new Error('You must be part of a family to link accounts');

  const { valid, code, error: codeErr } = sanitizeCode(linkingCode);
  if (!valid) throw new Error(codeErr);

  const family = await base44.entities.Family.get(user.family_id);
  if (!family) throw new Error('Family not found');

  // Validate code
  if (!family.linking_code || family.linking_code.toUpperCase() !== code) {
    throw new Error('Invalid linking code');
  }
  if (family.linking_code_expires && isExpired(family.linking_code_expires)) {
    throw new Error('Linking code has expired');
  }

  // Get family people
  const allPeople = await base44.entities.Person.list();
  const familyPeople = allPeople.filter(p => p.family_id === user.family_id);

  // Check if already linked
  const existingLink = familyPeople.find(p => p.linked_user_id === user.id);
  if (existingLink) {
    return {
      success: true,
      message: 'Account already linked to this family member',
      personId: existingLink.id,
      personName: existingLink.name,
      alreadyLinked: true,
    };
  }

  // Find unlinked people
  const unlinkedPeople = familyPeople.filter(p => !p.linked_user_id);
  if (unlinkedPeople.length === 0) {
    throw new Error('No available family member profiles to link');
  }

  if (unlinkedPeople.length > 1) {
    return {
      success: true,
      needsSelection: true,
      unlinkedPeople: unlinkedPeople.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        avatar_color: p.avatar_color,
      })),
    };
  }

  // Auto-link to the only unlinked person
  const person = unlinkedPeople[0];
  await base44.entities.Person.update(person.id, {
    linked_user_id: user.id,
    updated_at: new Date().toISOString(),
  });
  await base44.auth.updateMe({ linked_person_id: person.id });

  return {
    success: true,
    message: 'Successfully linked your account!',
    personId: person.id,
    personName: person.name,
  };
}

// ─── Link Account by Selection ────────────────────────────────────────────────

/**
 * Link account by selecting a specific person (after code validation).
 *
 * @param {string} personId
 */
export async function linkAccountBySelection(personId) {
  const user = await base44.auth.me();
  if (!user) throw new Error('Authentication required');
  if (!user.family_id) throw new Error('You must be part of a family');

  const person = await base44.entities.Person.get(personId);
  if (!person) throw new Error('Person not found');

  if (person.family_id !== user.family_id) {
    throw new Error('Person is not in your family');
  }
  if (person.linked_user_id) {
    throw new Error('This family member is already linked to another account');
  }

  await base44.entities.Person.update(personId, {
    linked_user_id: user.id,
    updated_at: new Date().toISOString(),
  });
  await base44.auth.updateMe({ linked_person_id: personId });

  return {
    success: true,
    message: 'Successfully linked your account!',
    personId: person.id,
    personName: person.name,
  };
}
