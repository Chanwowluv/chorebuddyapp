import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { requireLinkedAccount, requireAuth, parseRequestBody, errorResponse, successResponse, typedErrorResponse } from './lib/shared-utils.ts';

export default async function submitChore(req: Request) {
  const base44 = createClientFromRequest(req);
  
  const { user, error: authError } = await requireAuth(base44);
  if (authError) return authError;

  const { data: body, error: parseError } = await parseRequestBody(req);
  if (parseError) return parseError;

  const { assignmentId, choreId, notes, photoUrl, difficultyRating } = body as any;

  if (!assignmentId || !choreId) {
    return errorResponse('Missing assignmentId or choreId', 400);
  }

  try {
    // Get the person record for the user
    const persons = await base44.asServiceRole.entities.Person.filter({ linked_user_id: user.id });
    const person = persons[0];

    if (!person) {
      return typedErrorResponse('PERSON_NOT_FOUND', 'Person record not found');
    }

    // Apply the check!
    requireLinkedAccount(person);

    const assignment = await base44.asServiceRole.entities.Assignment.get(assignmentId);
    const chore = await base44.asServiceRole.entities.Chore.get(choreId);

    if (!assignment || !chore) {
      return errorResponse('Assignment or Chore not found', 404);
    }

    const needsApproval = chore.requires_approval;
    const points = chore.custom_points || 15; // Simplified points calculation

    // Create completion
    await base44.asServiceRole.entities.ChoreCompletion.create({
      assignment_id: assignmentId,
      person_id: assignment.person_id,
      chore_id: choreId,
      family_id: assignment.family_id,
      completion_status: needsApproval ? 'pending_approval' : 'submitted',
      points_awarded: needsApproval ? 0 : points,
      notes: notes || '',
      photo_url: photoUrl || '',
      difficulty_rating: difficultyRating || undefined,
      created_at: new Date().toISOString()
    });

    // Update assignment
    await base44.asServiceRole.entities.Assignment.update(assignmentId, {
      completed: true,
      completed_date: new Date().toISOString(),
      approval_status: needsApproval ? 'pending' : undefined,
      points_awarded: needsApproval ? 0 : points,
      notes: notes || undefined,
      photo_url: photoUrl || undefined,
      updated_at: new Date().toISOString()
    });

    if (!needsApproval) {
      await base44.asServiceRole.entities.Reward.create({
        person_id: assignment.person_id,
        chore_id: choreId,
        points: points,
        reward_type: "points",
        week_start: assignment.week_start,
        description: `Completed: ${chore.title}`,
        family_id: assignment.family_id,
        created_at: new Date().toISOString()
      });
    }

    return successResponse({ message: 'Chore submitted successfully' });
  } catch (error) {
    if (error.name === 'AppError') {
      return typedErrorResponse(error.code, error.message);
    }
    console.error('Error submitting chore:', error);
    return errorResponse('Internal server error', 500);
  }
}

Deno.serve(submitChore);