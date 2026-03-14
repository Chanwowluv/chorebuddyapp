import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Shared Utils Inlined ─────────────────────────────────────────────────────
export interface Base44Client {
  auth: {
    me(): Promise<AppUser | null>;
  };
  asServiceRole: {
    entities: {
      Person: EntityAPI<Person>;
      ChoreCompletion: EntityAPI<any>;
      Assignment: EntityAPI<any>;
      Reward: EntityAPI<any>;
      Chore: EntityAPI<any>;
    };
  };
}

export interface EntityAPI<T> {
  get(id: string): Promise<T>;
  filter(query: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
}

export interface AppUser {
  id: string;
  email: string;
  family_id?: string | null;
  family_role?: string;
  linked_person_id?: string | null;
}

export interface Person {
  id: string;
  name: string;
  family_id: string;
  linked_user_id?: string | null;
  role: string;
}

export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function requireLinkedAccount(person: Person): void {
  if (!person.linked_user_id) {
    throw new AppError("ACCOUNT_NOT_LINKED", "This person must link their account before performing this action");
  }
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers: HEADERS });
}

function typedErrorResponse(code: string, message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message, errorCode: code }), { status, headers: HEADERS });
}

function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ success: true, ...data }), { status: 200, headers: HEADERS });
}

export default async function submitChore(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS });

  const base44 = createClientFromRequest(req) as unknown as Base44Client;
  
  try {
    const user = await base44.auth.me();
    if (!user) return errorResponse('Authentication required', 401);

    const body = await req.json();
    const { assignmentId, choreId, notes, photoUrl, difficultyRating } = body;

    if (!assignmentId || !choreId) {
      return errorResponse('Missing assignmentId or choreId', 400);
    }

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
  } catch (error: any) {
    if (error.name === 'AppError') {
      return typedErrorResponse(error.code, error.message);
    }
    console.error('Error submitting chore:', error);
    return errorResponse('Internal server error', 500);
  }
}

Deno.serve(submitChore);