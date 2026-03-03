// parentCrud.ts
// Server-side enforcement of parent role for all parent-only CRUD operations.
// Validates authentication, parent role, entity whitelist, and family ownership
// before delegating to base44.asServiceRole.entities.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://chorebuddyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status, headers: HEADERS });
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

function isParent(user) {
  return user?.family_role === 'parent' || user?.data?.family_role === 'parent' || user?.role === 'admin';
}

function getUserFamilyId(user) {
  return user?.family_id || user?.data?.family_id || null;
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

async function requireParent(base44) {
  const { user, error } = await requireAuth(base44);
  if (error) return { user: null, error };

  if (!isParent(user)) {
    return { user: null, error: forbiddenResponse('Only parents can perform this action') };
  }

  return { user };
}

async function parseRequestBody(req) {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return { data: null, error: errorResponse('Invalid JSON in request body') };
  }
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

// Whitelist of entity+operation combinations allowed through this endpoint.
// Only parent-only operations are listed here. Operations that children need
// (e.g. Assignment update for chore completion) are NOT included.
const ALLOWED_OPERATIONS: Record<string, string[]> = {
  Person: ['create', 'update', 'delete'],
  Chore: ['create', 'update', 'delete'],
  Assignment: ['create', 'delete'],
  RedeemableItem: ['create', 'update', 'delete'],
  FamilyGoal: ['create', 'update', 'delete'],
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS });
  }

  const base44 = createClientFromRequest(req);

  try {
    // 1. Require parent role (includes authentication check)
    const { user, error: authError } = await requireParent(base44);
    if (authError) return authError;

    // 2. Parse request body
    const { data: body, error: parseError } = await parseRequestBody(req);
    if (parseError) return parseError;

    const { entity, operation, data, id } = body;

    // 3. Validate entity + operation against whitelist
    if (!entity || !operation) {
      return errorResponse('Missing entity or operation');
    }

    const allowedOps = ALLOWED_OPERATIONS[entity];
    if (!allowedOps || !allowedOps.includes(operation)) {
      return forbiddenResponse(`Operation '${operation}' not allowed on '${entity}'`);
    }

    // 4. Get user's family ID
    const familyId = getUserFamilyId(user);
    if (!familyId) {
      return errorResponse('User is not part of any family');
    }

    const entities = base44.asServiceRole.entities;

    // 5. Execute operation
    switch (operation) {
      case 'create': {
        if (!data) return errorResponse('Missing data for create');

        const record = await entities[entity].create({
          ...data,
          family_id: familyId,   // Server enforces family scoping
          created_by: user.id,   // Server enforces authorship
        });

        logInfo('parentCrud', `Created ${entity}`, { id: record.id, userId: user.id });
        return successResponse({ record });
      }

      case 'update': {
        if (!id) return errorResponse('Missing id for update');
        if (!data) return errorResponse('Missing data for update');

        // Verify entity belongs to user's family before allowing update
        const existing = await entities[entity].get(id);
        if (!existing) return errorResponse(`${entity} not found`, 404);
        if (existing.family_id !== familyId) {
          return forbiddenResponse('Access denied: entity belongs to a different family');
        }

        const updated = await entities[entity].update(id, data);
        logInfo('parentCrud', `Updated ${entity}`, { id, userId: user.id });
        return successResponse({ record: updated });
      }

      case 'delete': {
        if (!id) return errorResponse('Missing id for delete');

        // Verify entity belongs to user's family before allowing delete
        const toDelete = await entities[entity].get(id);
        if (!toDelete) return errorResponse(`${entity} not found`, 404);
        if (toDelete.family_id !== familyId) {
          return forbiddenResponse('Access denied: entity belongs to a different family');
        }

        await entities[entity].delete(id);
        logInfo('parentCrud', `Deleted ${entity}`, { id, userId: user.id });
        return successResponse({ deleted: true, id });
      }

      default:
        return errorResponse(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    logError('parentCrud', error);
    return errorResponse('Internal server error', 500);
  }
});