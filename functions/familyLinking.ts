// functions/familyLinking.ts
// Handles linking code generation, family joining (linking_code flow),
// account unlinking, and member listing.
// Refactored: parallel DB reads, shared rollbackJoin(), isValidRole on user.family_role,
//             typedErrorResponse, cache invalidation, background email dispatch.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  APP,
  HEADERS,
  requireAuth,
  parseRequestBody,
  sanitizeCode,
  generateCode,
  isValidRole,
  normaliseRole,
  isParent,
  getUserFamilyId,
  checkRateLimit,
  getFamily,
  canUserJoinFamilyWithTier,
  rollbackJoin,
  invalidateFamilyCache,
  validateLinkingCode,
  isExpired,
  calculateExpiryDate,
  typedErrorResponse,
  errorResponse,
  forbiddenResponse,
  successResponse,
  logError,
  logInfo,
  type Base44Client,
  type AppUser,
  type Family,
  type Person,
} from './lib/shared-utils.ts';

const CALLER = 'familyLinking';

// ─── Generate Code ────────────────────────────────────────────────────────────

async function handleGenerateCode(base44: Base44Client, user: AppUser, familyId: string) {
  if (!isParent(user)) return errorResponse('Only parents can generate linking codes', 403);

  const rateLimit = checkRateLimit(user.id, 'generate_linking_code', 5, 5 * 60 * 1000);
  if (!rateLimit.allowed) return errorResponse('Too many code generation requests. Please try again later.', 429);

  if (getUserFamilyId(user) !== familyId) {
    return errorResponse('You can only generate codes for your own family', 403);
  }

  const { family } = await getFamily(base44, familyId);
  if (!family) return errorResponse('Family not found', 404);

  const newCode = generateCode(8);
  const expiresAt = calculateExpiryDate();

  await base44.asServiceRole.entities.Family.update(familyId, {
    linking_code: newCode,
    linking_code_expires: expiresAt,
  });
  await invalidateFamilyCache(familyId);

  logInfo(CALLER, 'Generated new linking code', { familyId, userId: user.id });
  return successResponse({ linkingCode: newCode, expiresAt });
}

// ─── Join Family ──────────────────────────────────────────────────────────────

async function handleJoinFamily(base44: Base44Client, user: AppUser, linkingCode: string) {
  // Validate code format
  const { valid, code: sanitizedCode, error: codeErr } = sanitizeCode(linkingCode);
  if (!valid) return typedErrorResponse('INVALID_CODE', codeErr ?? 'Invalid code format');

  // Validate user.family_role before it's used — fixes the gap in the original code
  const roleToAssign = isValidRole(user.family_role) ? user.family_role : 'child';

  // Fetch family by linking code
  let families: Family[];
  try {
    families = await base44.asServiceRole.entities.Family.filter({ linking_code: sanitizedCode });
  } catch (err) {
    logError(CALLER, err, { context: 'handleJoinFamily_filter_family' });
    return typedErrorResponse('SERVER_ERROR', 'Failed to validate linking code. Please try again.');
  }

  if (families.length === 0) {
    return typedErrorResponse('INVALID_CODE', 'Invalid linking code. Please check and try again.');
  }

  const family = families[0];

  // Check expiry
  if (family.linking_code_expires && isExpired(family.linking_code_expires)) {
    return typedErrorResponse('EXPIRED_CODE', 'This linking code has expired. Please ask your parent for a new code.');
  }

  const originalMembers = family.members ? [...family.members] : [];

  // Capacity check
  const joinCheck = canUserJoinFamilyWithTier(user, family, originalMembers.length);
  if (!joinCheck.allowed) {
    const keyMap: Record<string, Parameters<typeof typedErrorResponse>[0]> = {
      already_member:     'ALREADY_MEMBER',
      already_in_family:  'ALREADY_IN_FAMILY',
      family_full:        'FAMILY_FULL',
      tier_limit_reached: 'TIER_LIMIT',
    };
    const key = keyMap[joinCheck.reason ?? ''] ?? 'JOIN_FAILED';
    return typedErrorResponse(key, joinCheck.message ?? 'Could not join family');
  }

  // Idempotency guard
  if (originalMembers.includes(user.id)) {
    return typedErrorResponse('ALREADY_MEMBER', 'You are already a member of this family');
  }

  // Step 1 — create Person first so we always hold its ID before touching Family.
  // (Running both in parallel would leave newPerson null if Person.create
  //  succeeded but Family.update failed, preventing orphan cleanup in rollback.)
  const updatedMembers = [...originalMembers, user.id];
  let newPerson: Person | null = null;

  try {
    newPerson = await base44.asServiceRole.entities.Person.create({
      name: user.full_name || user.email || 'Family Member',
      family_id: family.id,
      linked_user_id: user.id,
      role: normaliseRole(roleToAssign),
      is_active: true,
      points_balance: 0,
      total_points_earned: 0,
      chores_completed_count: 0,
      current_streak: 0,
      best_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    logError(CALLER, err, { context: 'handleJoinFamily_create_person' });
    return typedErrorResponse('JOIN_FAILED', 'Failed to create your profile in the family. Please try again.');
  }

  // Step 2 — update Family.members now that we have the Person ID
  try {
    await base44.asServiceRole.entities.Family.update(family.id, {
      members: updatedMembers,
      member_count: updatedMembers.length,
    });
  } catch (err) {
    logError(CALLER, err, { context: 'handleJoinFamily_update_family' });
    await rollbackJoin(base44, {
      personId: newPerson.id,
      userId: user.id,
      familyId: family.id,
      originalFamilyId: user.family_id ?? null,
      originalMembers,
    }, CALLER);
    return typedErrorResponse('JOIN_FAILED', 'Failed to create your profile in the family. Please try again.');
  }

  await invalidateFamilyCache(family.id);

  // Update user's family_id and linked_person_id
  try {
    await base44.auth.updateMe({
      family_id: family.id,
      linked_person_id: newPerson.id,
    });
  } catch (err) {
    logError(CALLER, err, { context: 'handleJoinFamily_updateMe' });
    await rollbackJoin(base44, {
      personId: newPerson.id,
      userId: user.id,
      familyId: family.id,
      originalFamilyId: user.family_id ?? null,
      originalMembers,
    }, CALLER);
    return typedErrorResponse('JOIN_FAILED', 'Failed to complete family join. Please try again.');
  }

  logInfo(CALLER, 'User joined family via linking code', {
    userId: user.id,
    familyId: family.id,
    personId: newPerson.id,
  });

  // Send parent notifications asynchronously — response is returned immediately
  notifyParentsAsync(base44, user, family, roleToAssign);

  return successResponse({ familyName: family.name, familyId: family.id, personId: newPerson.id });
}

/**
 * Best-effort fire-and-forget parent notification.
 * NOTE: Deno Deploy does not expose waitUntil(), so this floating IIFE may be
 * collected before all emails complete if the isolate is recycled immediately
 * after the response is sent. Notifications are intentionally non-critical.
 */
function notifyParentsAsync(base44: Base44Client, joiner: AppUser, family: Family, joinerRole: string): void {
  (async () => {
    try {
      const familyPeople = await base44.asServiceRole.entities.Person.filter({
        family_id: family.id,
        role: 'parent',
      });
      const joinerName = joiner.full_name || joiner.email || 'A new member';

      await Promise.allSettled(
        familyPeople
          .filter((p: Person) => p.linked_user_id && p.linked_user_id !== joiner.id)
          .map(async (parentPerson: Person) => {
            try {
              const parentUser = await base44.asServiceRole.entities.User.get(parentPerson.linked_user_id!);
              if (!parentUser?.email) return;
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: parentUser.email,
                subject: `${APP.NAME}: ${joinerName} has joined your family!`,
                body: `<h2>New Family Member!</h2>
                       <p><strong>${joinerName}</strong> has joined <strong>${family.name}</strong> as a <strong>${joinerRole}</strong> using your linking code.</p>
                       <p>They can now be assigned chores and start earning rewards!</p>
                       <p><a href="${APP.URL}/People">View Family Members</a></p>`,
                from_name: APP.NAME,
              });
            } catch (emailErr) {
              logError(CALLER, emailErr, { context: 'notify_parent_email', parentPersonId: parentPerson.id });
            }
          })
      );
    } catch (err) {
      logError(CALLER, err, { context: 'notifyParentsAsync' });
    }
  })();
}

// ─── Unlink Account ───────────────────────────────────────────────────────────

async function handleUnlinkAccount(base44: Base44Client, user: AppUser, personId: string) {
  if (!isParent(user)) return forbiddenResponse('Only parents can unlink accounts');

  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) return errorResponse('You are not part of any family');

  // Parallel: fetch person + family
  let person: Person;
  let family: Family | null;
  try {
    const [fetchedPerson, { family: fetchedFamily }] = await Promise.all([
      base44.asServiceRole.entities.Person.get(personId),
      getFamily(base44, userFamilyId),
    ]);
    person = fetchedPerson;
    family = fetchedFamily;
  } catch {
    return errorResponse('Person not found', 404);
  }

  if (person.family_id !== userFamilyId) return forbiddenResponse('Person is not in your family');
  if (family && person.linked_user_id === family.owner_user_id) {
    return errorResponse('Cannot unlink the family owner');
  }

  const unlinkedUserId = person.linked_user_id;

  // Clear Person → User link, then User → Person link in parallel
  try {
    await base44.asServiceRole.entities.Person.update(personId, {
      linked_user_id: null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    logError(CALLER, err, { context: 'handleUnlinkAccount', personId });
    return errorResponse('Failed to unlink account. Please try again.', 500);
  }

  // Best-effort cleanup on the User side
  if (unlinkedUserId) {
    try {
      await base44.asServiceRole.entities.User.update(unlinkedUserId, { linked_person_id: null });
    } catch (err) {
      logError(CALLER, err, { context: 'clear_linked_person_id', unlinkedUserId });
    }
  }

  logInfo(CALLER, 'Account unlinked from person', { userId: user.id, personId, unlinkedUserId });
  return successResponse({ personId });
}

// ─── Get Members ──────────────────────────────────────────────────────────────

async function handleGetMembers(base44: Base44Client, user: AppUser) {
  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) return errorResponse('You are not part of any family');

  let people: Person[];
  try {
    people = await base44.asServiceRole.entities.Person.filter({ family_id: userFamilyId });
  } catch {
    return errorResponse('Failed to fetch family members', 500);
  }

  const members = people.map((p: Person) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    linked_user_id: p.linked_user_id ?? null,
    avatar_color: p.avatar_color ?? null,
  }));

  return successResponse({ members });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS });

  const base44 = createClientFromRequest(req) as Base44Client;

  try {
    const [{ user, error: authError }, { data: body, error: parseError }] = await Promise.all([
      requireAuth(base44),
      parseRequestBody(req),
    ]);
    if (authError) return authError;
    if (parseError) return parseError;

    const { action, linkingCode, familyId, personId } = body as {
      action?: string;
      linkingCode?: string;
      familyId?: string;
      personId?: string;
    };

    switch (action) {
      case 'generate':
        if (!familyId) return errorResponse('Family ID required for code generation');
        return handleGenerateCode(base44, user!, familyId);

      case 'join':
        if (!linkingCode) return errorResponse('Linking code required to join family');
        return handleJoinFamily(base44, user!, linkingCode);

      case 'unlink':
        if (!personId) return errorResponse('Person ID required for unlinking');
        return handleUnlinkAccount(base44, user!, personId);

      case 'getMembers':
        return handleGetMembers(base44, user!);

      default:
        return errorResponse('Invalid action. Use "generate", "join", "unlink", or "getMembers"');
    }
  } catch (err) {
    logError(CALLER, err);
    return typedErrorResponse('SERVER_ERROR', 'An internal server error occurred');
  }
});