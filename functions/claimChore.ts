// functions/claimChore.ts
// Allows children/teens to self-assign chores from the "chore pool"
// when the family setting `allow_self_assignment` is enabled.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  requireAuth,
  getUserFamilyId,
  checkRateLimit,
  errorResponse,
  successResponse,
  logError,
  logInfo,
  parseRequestBody,
} from './lib/shared-utils.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Require authenticated user
    const { user, error: authError } = await requireAuth(base44);
    if (authError) return authError;

    // Rate limit: max 10 claims per hour
    const rateLimit = checkRateLimit(user.id, 'claim_chore', 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return errorResponse('Too many claim attempts. Please try again later.', 429);
    }

    // Parse request body
    const { data: body, error: parseError } = await parseRequestBody(req);
    if (parseError) return parseError;

    const { choreId } = body;
    if (!choreId) {
      return errorResponse('choreId is required');
    }

    // Verify user is in a family
    const familyId = getUserFamilyId(user);
    if (!familyId) {
      return errorResponse('You are not part of any family');
    }

    // Verify user has a linked person ID
    const personId = user.linked_person_id;
    if (!personId) {
      return errorResponse('Your account is not linked to a family member profile');
    }

    // Get the family and check settings
    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (!family) {
      return errorResponse('Family not found', 404);
    }

    if (!family.settings?.allow_self_assignment) {
      return errorResponse('Self-assignment is not enabled for your family', 403);
    }

    // Get the chore and verify it's pool-eligible
    const chore = await base44.asServiceRole.entities.Chore.get(choreId);
    if (!chore) {
      return errorResponse('Chore not found', 404);
    }

    if (chore.family_id !== familyId) {
      return errorResponse('This chore does not belong to your family', 403);
    }

    if (!chore.pool_eligible) {
      return errorResponse('This chore is not available for self-assignment');
    }

    // Calculate current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Check for duplicate assignment this week
    const existingAssignments = await base44.asServiceRole.entities.Assignment.filter({
      chore_id: choreId,
      person_id: personId,
      week_start: weekStartStr,
    });

    if (existingAssignments.length > 0) {
      return errorResponse('You have already claimed this chore for this week');
    }

    // Create the assignment
    const newAssignment = await base44.asServiceRole.entities.Assignment.create({
      chore_id: choreId,
      person_id: personId,
      family_id: familyId,
      week_start: weekStartStr,
      completed: false,
      is_self_assigned: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logInfo('claimChore', 'Chore claimed by child', {
      userId: user.id,
      personId,
      choreId,
      assignmentId: newAssignment.id,
    });

    return successResponse({
      assignmentId: newAssignment.id,
      choreId,
      choreName: chore.name || chore.title,
    });
  } catch (error) {
    logError('claimChore', error, { context: 'main_handler' });
    return errorResponse('An internal server error occurred', 500);
  }
});
