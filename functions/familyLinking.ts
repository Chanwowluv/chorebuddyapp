// functions/familyLinking.ts
// Handles family linking code generation and joining
// Consolidates duplicate code and improves security

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  requireAuth,
  requireParent,
  isParent,
  generateCode,
  sanitizeCode,
  calculateExpiryDate,
  getUserFamilyId,
  getFamily,
  updateEntityWithEnv,
  canUserJoinFamilyWithTier,
  checkRateLimit,
  errorResponse,
  errorResponseWithCode,
  successResponse,
  forbiddenResponse,
  logError,
  logInfo,
  parseRequestBody,
  JOIN_ERROR_CODES,
} from './lib/shared-utils.ts';

/**
 * Generate a new linking code for a family
 */
async function handleGenerateCode(base44: any, user: any, familyId: string) {
  // Verify user is a parent
  if (!user || !isParent(user)) {
    return errorResponse('Only parents can generate linking codes', 403);
  }

  // Rate limit: max 5 code generations per 5 minutes
  const rateLimit = checkRateLimit(user.id, 'generate_linking_code', 5, 5 * 60 * 1000);
  if (!rateLimit.allowed) {
    return errorResponse('Too many code generation requests. Please try again later.', 429);
  }

  // Verify user is in this family
  const userFamilyId = getUserFamilyId(user);
  if (userFamilyId !== familyId) {
    return errorResponse('You can only generate codes for your own family', 403);
  }

  // Get family with environment detection
  const { family, env } = await getFamily(base44, familyId);
  if (!family) {
    return errorResponse('Family not found', 404);
  }

  // Generate new code
  const newCode = generateCode(6);
  const expiresAt = calculateExpiryDate(24); // 24 hours

  // Update family
  await updateEntityWithEnv(
    base44,
    'Family',
    familyId,
    {
      linking_code: newCode,
      linking_code_expires: expiresAt,
    },
    env
  );

  logInfo('familyLinking', 'Generated new linking code', { familyId, userId: user.id });

  return successResponse({
    linkingCode: newCode,
    expiresAt,
  });
}

/**
 * Join a family using a linking code
 */
async function handleJoinFamily(base44: any, user: any, linkingCode: string) {
  // Validate and sanitize code
  const { valid, code: sanitizedCode, error } = sanitizeCode(linkingCode);
  if (!valid) {
    return errorResponseWithCode(
      error || 'Invalid code format',
      JOIN_ERROR_CODES.INVALID_CODE
    );
  }

  // Find family with this linking code
  const families = await base44.asServiceRole.entities.Family.filter({
    linking_code: sanitizedCode,
  });

  if (families.length === 0) {
    return errorResponseWithCode(
      'Invalid linking code. Please check and try again.',
      JOIN_ERROR_CODES.INVALID_CODE,
      404
    );
  }

  const family = families[0];

  // Check if code is expired
  if (family.linking_code_expires) {
    const expiryDate = new Date(family.linking_code_expires);
    if (expiryDate < new Date()) {
      return errorResponseWithCode(
        'This linking code has expired. Please ask your parent for a new code.',
        JOIN_ERROR_CODES.EXPIRED_CODE
      );
    }
  }

  // Check if user can join (with tier-based limits)
  const currentMembers = family.members || [];
  const joinCheck = canUserJoinFamilyWithTier(user, family, currentMembers.length);

  if (!joinCheck.allowed) {
    const reasonToCode: Record<string, string> = {
      already_member: JOIN_ERROR_CODES.ALREADY_MEMBER,
      already_in_family: JOIN_ERROR_CODES.ALREADY_IN_FAMILY,
      family_full: JOIN_ERROR_CODES.FAMILY_FULL,
      tier_limit_reached: JOIN_ERROR_CODES.TIER_LIMIT,
    };
    const errorCode = reasonToCode[joinCheck.reason] || JOIN_ERROR_CODES.JOIN_FAILED;
    const statusCode =
      joinCheck.reason === 'already_in_family' || joinCheck.reason === 'already_member'
        ? 409
        : 400;
    return errorResponseWithCode(joinCheck.message, errorCode, statusCode);
  }

  // Prevent duplicate member entries
  if (currentMembers.includes(user.id)) {
    return errorResponseWithCode(
      'You are already a member of this family',
      JOIN_ERROR_CODES.ALREADY_MEMBER,
      409
    );
  }

  // Add user to family and update member count
  const updatedMembers = [...currentMembers, user.id];
  await base44.asServiceRole.entities.Family.update(family.id, {
    members: updatedMembers,
    member_count: updatedMembers.length,
  });

  // Update user's family_id
  await base44.auth.updateMe({
    family_id: family.id,
  });

  // Create a Person record so the joining user appears in the family member list
  let personId: string | null = null;
  try {
    const personName = user.full_name || user.email || 'Family Member';
    const personRole = user.family_role || 'child';

    const newPerson = await base44.asServiceRole.entities.Person.create({
      name: personName,
      family_id: family.id,
      linked_user_id: user.id,
      role: personRole,
      is_active: true,
      points_balance: 0,
      total_points_earned: 0,
      chores_completed_count: 0,
      current_streak: 0,
      best_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    personId = newPerson.id;
    logInfo('familyLinking', 'Person record created for joining user', {
      userId: user.id,
      personId,
      familyId: family.id,
    });
  } catch (personError) {
    // Rollback: restore family members and clear user's family_id
    logError('familyLinking', personError, { context: 'person_creation_rollback' });
    try {
      await base44.asServiceRole.entities.Family.update(family.id, {
        members: currentMembers,
        member_count: currentMembers.length,
      });
      await base44.auth.updateMe({ family_id: null });
    } catch (rollbackError) {
      logError('familyLinking', rollbackError, { context: 'rollback_failed' });
    }
    return errorResponseWithCode(
      'Failed to create your profile in the family. Please try again.',
      JOIN_ERROR_CODES.JOIN_FAILED,
      500
    );
  }

  logInfo('familyLinking', 'User joined family via linking code', {
    userId: user.id,
    familyId: family.id,
    personId,
  });

  return successResponse({
    familyName: family.name,
    familyId: family.id,
    personId,
  });
}

/**
 * Unlink a user account from a Person record
 */
async function handleUnlinkAccount(base44: any, user: any, personId: string) {
  // Require parent role
  if (!isParent(user)) {
    return forbiddenResponse('Only parents can unlink accounts');
  }

  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) {
    return errorResponse('You are not part of any family');
  }

  // Get the person record
  let person;
  try {
    person = await base44.asServiceRole.entities.Person.get(personId);
  } catch {
    return errorResponse('Person not found', 404);
  }

  // Verify person is in same family
  if (person.family_id !== userFamilyId) {
    return forbiddenResponse('Person is not in your family');
  }

  // Prevent unlinking the family owner
  const { family } = await getFamily(base44, userFamilyId);
  if (family && person.linked_user_id === family.owner_user_id) {
    return errorResponse('Cannot unlink the family owner');
  }

  // Clear linked_user_id
  await base44.asServiceRole.entities.Person.update(personId, {
    linked_user_id: null,
    updated_at: new Date().toISOString(),
  });

  logInfo('familyLinking', 'Account unlinked from person', {
    userId: user.id,
    personId,
    unlinkedUserId: person.linked_user_id,
  });

  return successResponse({ personId });
}

/**
 * Get family members
 */
async function handleGetMembers(base44: any, user: any) {
  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) {
    return errorResponse('You are not part of any family');
  }

  let people;
  try {
    people = await base44.asServiceRole.entities.Person.filter({
      family_id: userFamilyId,
    });
  } catch {
    return errorResponse('Failed to fetch family members', 500);
  }

  const members = people.map((p: any) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    linked_user_id: p.linked_user_id || null,
    avatar_color: p.avatar_color || null,
  }));

  return successResponse({ members });
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Authentication check
    const { user, error: authError } = await requireAuth(base44);
    if (authError) return authError;

    // Parse request body
    const { data: body, error: parseError } = await parseRequestBody(req);
    if (parseError) return parseError;

    const { action, linkingCode, familyId, personId } = body;

    // Route to appropriate handler
    switch (action) {
      case 'generate':
        if (!familyId) {
          return errorResponse('Family ID required for code generation');
        }
        return await handleGenerateCode(base44, user, familyId);

      case 'join':
        if (!linkingCode) {
          return errorResponse('Linking code required to join family');
        }
        return await handleJoinFamily(base44, user, linkingCode);

      case 'unlink':
        if (!personId) {
          return errorResponse('Person ID required for unlinking');
        }
        return await handleUnlinkAccount(base44, user, personId);

      case 'getMembers':
        return await handleGetMembers(base44, user);

      default:
        return errorResponse('Invalid action. Use "generate", "join", "unlink", or "getMembers"');
    }
  } catch (error) {
    logError('familyLinking', error);
    return errorResponseWithCode(
      'An internal server error occurred',
      JOIN_ERROR_CODES.SERVER_ERROR,
      500
    );
  }
});
