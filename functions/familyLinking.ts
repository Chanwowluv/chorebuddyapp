// functions/familyLinking.ts
// Handles family linking code generation and joining
// Consolidates duplicate code and improves security

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TIME = {
  ONE_MINUTE_MS: 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://chorebuddyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const APP = {
  URL: 'https://chorebuddyapp.com',
  NAME: 'ChoreBuddy',
};

const VALID_ROLES = ['parent', 'teen', 'child', 'toddler'];

const JOIN_ERROR_CODES = {
  INVALID_CODE: 'INVALID_CODE',
  EXPIRED_CODE: 'EXPIRED_CODE',
  INVALID_ROLE: 'INVALID_ROLE',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  ALREADY_IN_FAMILY: 'ALREADY_IN_FAMILY',
  FAMILY_FULL: 'FAMILY_FULL',
  TIER_LIMIT: 'TIER_LIMIT',
  INVALID_FAMILY: 'INVALID_FAMILY',
  JOIN_FAILED: 'JOIN_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SERVER_ERROR: 'SERVER_ERROR',
};

const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  FAMILY_PLUS: 'family_plus',
  ENTERPRISE: 'enterprise',
};

const MAX_FAMILY_SIZE = 50;
const CODE_EXPIRY_HOURS = 48;

const TIER_MEMBER_LIMITS = {
  free: 6,
  premium: 15,
  family_plus: 30,
  enterprise: 50,
};

function sanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Code is required' };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length < 6) {
    return { valid: false, error: 'Invalid code format' };
  }

  // Check for malicious input
  if (/[<>'"\\]/.test(trimmed)) {
    return { valid: false, error: 'Invalid code format' };
  }

  return { valid: true, code: trimmed };
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isParent(user) {
  return user?.family_role === 'parent' || user?.data?.family_role === 'parent' || user?.role === 'admin';
}

function getUserFamilyId(user) {
  return user?.family_id || user?.data?.family_id || null;
}

const rateLimitStore = new Map();

function checkRateLimit(
  userId,
  action,
  maxRequests,
  windowMs
) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, resetTime: existing.resetTime };
  }

  existing.count++;
  return { allowed: true };
}

// Removed findEntityAcrossEnvs and updateEntityWithEnv as SDK handles env automatically

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status, headers: HEADERS });
}

function errorResponseWithCode(
  message,
  code,
  status = 400,
  details
) {
  return Response.json(
    { error: message, errorCode: code, ...details },
    { status, headers: HEADERS }
  );
}

function successResponse(data, status = 200) {
  return Response.json({ success: true, ...data }, { status, headers: HEADERS });
}

function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401);
}

function forbiddenResponse(message = 'Forbidden') {
  return errorResponse(message, 403);
}

async function requireAuth(base44) {
  try {
    const user = await base44.auth.me();
    if (!user || !user.id) {
      return { user: null, error: unauthorizedResponse('User not authenticated') };
    }
    return { user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, error: unauthorizedResponse('Authentication failed') };
  }
}

async function getFamily(
  base44,
  familyId
) {
  try {
    const family = await base44.asServiceRole.entities.Family.get(familyId);
    return { family };
  } catch (error) {
    return { family: null };
  }
}

function canUserJoinFamily(
  user,
  family,
  currentSize
) {
  const userFamilyId = getUserFamilyId(user);

  if (userFamilyId === family.id) {
    return {
      allowed: false,
      reason: 'already_member',
      message: 'You are already a member of this family',
    };
  }

  if (userFamilyId && userFamilyId !== family.id) {
    return {
      allowed: false,
      reason: 'already_in_family',
      message: 'You are already in another family',
    };
  }

  if (currentSize >= MAX_FAMILY_SIZE) {
    return {
      allowed: false,
      reason: 'family_full',
      message: 'This family has reached its maximum size',
    };
  }

  return { allowed: true };
}

function canUserJoinFamilyWithTier(
  user,
  family,
  currentSize
) {
  const baseCheck = canUserJoinFamily(user, family, currentSize);
  if (!baseCheck.allowed) return baseCheck;

  const tier = family.subscription_tier || 'free';
  const tierLimit = TIER_MEMBER_LIMITS[tier] || TIER_MEMBER_LIMITS.free;
  if (currentSize >= tierLimit) {
    return {
      allowed: false,
      reason: 'tier_limit_reached',
      message: `This family has reached its ${tier} plan limit of ${tierLimit} members. The family owner needs to upgrade.`,
    };
  }
  return { allowed: true };
}

function logError(context, error, metadata) {
  console.error(`[ERROR] ${context}:`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
  });
}

function logInfo(context, message, metadata) {
  console.log(`[INFO] ${context}:`, message, metadata || '');
}

function calculateExpiryDate(hours = CODE_EXPIRY_HOURS) {
  return new Date(Date.now() + hours * TIME.ONE_HOUR_MS).toISOString();
}

async function parseRequestBody(req) {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return { data: null, error: errorResponse('Invalid JSON in request body') };
  }
}

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

  // Get family
  const { family } = await getFamily(base44, familyId);
  if (!family) {
    return errorResponse('Family not found', 404);
  }

  // Generate new code (must be 8 chars for Family.json schema)
  const newCode = generateCode(8);
  const expiresAt = calculateExpiryDate(); // uses CODE_EXPIRY_HOURS (48h)

  // Update family
  await base44.asServiceRole.entities.Family.update(familyId, {
    linking_code: newCode,
    linking_code_expires: expiresAt,
  });

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
    // Rollback: restore family members (auth.updateMe not yet called, so no user rollback needed)
    logError('familyLinking', personError, { context: 'person_creation_rollback' });
    try {
      await base44.asServiceRole.entities.Family.update(family.id, {
        members: currentMembers,
        member_count: currentMembers.length,
      });
    } catch (rollbackError) {
      logError('familyLinking', rollbackError, { context: 'rollback_failed' });
    }
    return errorResponseWithCode(
      'Failed to create your profile in the family. Please try again.',
      JOIN_ERROR_CODES.JOIN_FAILED,
      500
    );
  }

  // Update user's family_id and linked_person_id after Person record exists
  try {
    await base44.auth.updateMe({
      family_id: family.id,
      linked_person_id: personId,
    });
  } catch (updateError) {
    // Rollback: delete Person record and restore family members
    logError('familyLinking', updateError, { context: 'user_update_rollback' });
    try {
      if (personId) {
        await base44.asServiceRole.entities.Person.delete(personId);
      }
      await base44.asServiceRole.entities.Family.update(family.id, {
        members: currentMembers,
        member_count: currentMembers.length,
      });
    } catch (rollbackError) {
      logError('familyLinking', rollbackError, { context: 'rollback_failed' });
    }
    return errorResponseWithCode(
      'Failed to complete family join. Please try again.',
      JOIN_ERROR_CODES.JOIN_FAILED,
      500
    );
  }

  logInfo('familyLinking', 'User joined family via linking code', {
    userId: user.id,
    familyId: family.id,
    personId,
  });

  // Notify parent(s) that a new member joined
  try {
    const familyPeople = await base44.asServiceRole.entities.Person.filter({
      family_id: family.id,
      role: 'parent',
    });

    const joinerName = user.full_name || user.email || 'A new member';
    const joinerRole = user.family_role || 'child';

    for (const parentPerson of familyPeople) {
      if (parentPerson.linked_user_id && parentPerson.linked_user_id !== user.id) {
        try {
          const parentUser = await base44.asServiceRole.entities.User.get(parentPerson.linked_user_id);
          if (parentUser?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: parentUser.email,
              subject: `${APP.NAME}: ${joinerName} has joined your family!`,
              body: `<h2>New Family Member!</h2>
                     <p><strong>${joinerName}</strong> has joined <strong>${family.name}</strong> as a <strong>${joinerRole}</strong> using your linking code.</p>
                     <p>They can now be assigned chores and start earning rewards!</p>
                     <p><a href="${APP.URL}/People">View Family Members</a></p>`,
              from_name: APP.NAME,
            });
          }
        } catch (emailError) {
          logError('familyLinking', emailError, { context: 'parent_notification_email' });
        }
      }
    }
  } catch (notifyError) {
    // Non-critical: join succeeded, notification is best-effort
    logError('familyLinking', notifyError, { context: 'parent_notification' });
  }

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

  // Capture the user ID before clearing the link
  const unlinkedUserId = person.linked_user_id;

  // Clear the Person → User link
  try {
    await base44.asServiceRole.entities.Person.update(personId, {
      linked_user_id: null,
      updated_at: new Date().toISOString(),
    });
  } catch (unlinkError) {
    logError('familyLinking', unlinkError, {
      context: 'handleUnlinkAccount_unlink_operation',
      userId: user.id,
      personId,
    });
    return errorResponse('Failed to unlink account. Please try again.', 500);
  }

  // Clear the User → Person link on the unlinked user
  if (unlinkedUserId) {
    try {
      await base44.asServiceRole.entities.User.update(unlinkedUserId, {
        linked_person_id: null,
      });
    } catch (userUpdateError) {
      // Non-critical: Person already unlinked, user cleanup is best-effort
      logError('familyLinking', userUpdateError, {
        context: 'clear_linked_person_id',
        unlinkedUserId,
        personId,
      });
    }
  }

  logInfo('familyLinking', 'Account unlinked from person', {
    userId: user.id,
    personId,
    unlinkedUserId,
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS });
  }

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