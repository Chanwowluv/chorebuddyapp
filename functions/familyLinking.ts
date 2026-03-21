// functions/familyLinking.ts
// Handles linking code generation, family joining (linking_code flow),
// account unlinking, and member listing.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Shared Utils Inlined ─────────────────────────────────────────────────────
export interface Base44Client {
  auth: {
    getUser(): Promise<AppUser | null>;
    updateMe(data: Partial<AppUser>): Promise<void>;
  };
  asServiceRole: {
    entities: {
      User: EntityAPI<AppUser>;
      Family: EntityAPI<Family>;
      Person: EntityAPI<Person>;
    };
    integrations: {
      Core: {
        SendEmail(opts: EmailOptions): Promise<void>;
      };
    };
  };
}

export interface EntityAPI<T> {
  get(id: string): Promise<T>;
  filter(query: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  family_id?: string | null;
  family_role?: string;
  linked_person_id?: string | null;
}

export interface Family {
  id: string;
  name: string;
  owner_user_id?: string;
  members?: string[];
  member_count?: number;
  invite_code?: string;
  linking_code?: string;
  linking_code_expires?: string;
  tier?: string;
  max_members?: number;
}

export interface Person {
  id: string;
  name: string;
  family_id: string;
  linked_user_id?: string | null;
  role: string;
  points_balance?: number;
  total_points_earned?: number;
  chores_completed_count?: number;
  current_streak?: number;
  best_streak?: number;
  is_active?: boolean;
  avatar_color?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
}

export interface CodeValidation {
  valid: boolean;
  code: string;
  error?: string;
}

export interface JoinCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
}

export interface FamilyLookup {
  family: Family | null;
  error?: string;
}

export interface AuthResult {
  user: AppUser | null;
  error?: Response;
}

export interface ParseResult {
  data: Record<string, unknown>;
  error?: Response;
}

export interface RollbackState {
  personId?: string | null;
  userId: string;
  familyId: string;
  originalFamilyId?: string | null;
  originalMembers: string[];
}

const APP = {
  NAME: 'ChoreBuddy',
  URL: 'https://chorebuddy.app',
} as const;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

const CODE_EXPIRY_HOURS = 48;

const VALID_ROLES = ['parent', 'teen', 'child'] as const;
type ValidRole = typeof VALID_ROLES[number];

const TIER_LIMITS: Record<string, number> = {
  free: 4,
  premium: 10,
  family: 20,
};

const ERROR_CODES = {
  AUTH_REQUIRED:       { code: 'AUTH_REQUIRED',       status: 401 },
  PARENT_REQUIRED:     { code: 'PARENT_REQUIRED',      status: 403 },
  ACCESS_DENIED:       { code: 'ACCESS_DENIED',        status: 403 },
  INVALID_FAMILY:      { code: 'INVALID_FAMILY',       status: 400 },
  FAMILY_NOT_FOUND:    { code: 'FAMILY_NOT_FOUND',     status: 404 },
  FAMILY_FULL:         { code: 'FAMILY_FULL',          status: 400 },
  NO_FAMILY:           { code: 'NO_FAMILY',            status: 400 },
  INVALID_CODE:        { code: 'INVALID_CODE',         status: 400 },
  EXPIRED_CODE:        { code: 'EXPIRED_CODE',         status: 400 },
  ALREADY_MEMBER:      { code: 'ALREADY_MEMBER',       status: 409 },
  ALREADY_IN_FAMILY:   { code: 'ALREADY_IN_FAMILY',    status: 409 },
  TIER_LIMIT:          { code: 'TIER_LIMIT',           status: 400 },
  INVALID_ROLE:        { code: 'INVALID_ROLE',         status: 400 },
  ALREADY_LINKED:      { code: 'ALREADY_LINKED',       status: 409 },
  USER_ALREADY_LINKED: { code: 'USER_ALREADY_LINKED',  status: 409 },
  PERSON_NOT_FOUND:    { code: 'PERSON_NOT_FOUND',     status: 404 },
  NO_UNLINKED_PEOPLE:  { code: 'NO_UNLINKED_PEOPLE',   status: 400 },
  JOIN_FAILED:         { code: 'JOIN_FAILED',          status: 500 },
  LINK_FAILED:         { code: 'LINK_FAILED',          status: 500 },
  RATE_LIMITED:        { code: 'RATE_LIMITED',         status: 429 },
  SERVER_ERROR:        { code: 'SERVER_ERROR',         status: 500 },
} as const;

type ErrorCodeKey = keyof typeof ERROR_CODES;

function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: HEADERS,
  });
}

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: HEADERS,
  });
}

function typedErrorResponse(
  key: ErrorCodeKey,
  message: string,
  statusOverride?: number
): Response {
  const { code, status } = ERROR_CODES[key];
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode: code }),
    { status: statusOverride ?? status, headers: HEADERS }
  );
}

function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

async function requireAuth(base44: Base44Client): Promise<AuthResult> {
  try {
    // @ts-ignore - auth.me is the correct method
    const user = await base44.auth.me();
    if (!user) {
      return { user: null, error: unauthorizedResponse('Authentication required') };
    }
    return { user };
  } catch (err) {
    logError('requireAuth', err);
    return { user: null, error: unauthorizedResponse('Authentication required') };
  }
}

async function parseRequestBody(req: Request): Promise<ParseResult> {
  try {
    const body = await req.json();
    return { data: body };
  } catch {
    return {
      data: {},
      error: errorResponse('Invalid or missing JSON request body', 400),
    };
  }
}

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role.toLowerCase());
}

function normaliseRole(role: unknown): ValidRole {
  if (typeof role === 'string') {
    const lower = role.toLowerCase();
    if ((VALID_ROLES as readonly string[]).includes(lower)) return lower as ValidRole;
  }
  return 'child';
}

function isParent(user: AppUser): boolean {
  return user.family_role?.toLowerCase() === 'parent';
}

function getUserFamilyId(user: AppUser): string | null {
  return user.family_id ?? null;
}

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function sanitizeCode(raw: unknown): CodeValidation {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, code: '', error: 'Invite code is required' };
  }
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6 || code.length > 12) {
    return { valid: false, code: '', error: 'Code must be between 6 and 12 characters' };
  }
  return { valid: true, code };
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function calculateExpiryDate(hours = CODE_EXPIRY_HOURS): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function validateLinkingCode(
  family: Family,
  sanitizedCode: string
): { valid: boolean; error?: string } {
  if (!family.linking_code) return { valid: false, error: 'No linking code found' };
  if (family.linking_code.toUpperCase() !== sanitizedCode) {
    return { valid: false, error: 'Invalid linking code' };
  }
  if (family.linking_code_expires && isExpired(family.linking_code_expires)) {
    return { valid: false, error: 'Linking code has expired' };
  }
  return { valid: true };
}

async function getFamily(
  base44: Base44Client,
  familyId: string
): Promise<FamilyLookup> {
  try {
    const cached = await familyCache.get(familyId);
    if (cached) return { family: cached };

    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (family) await familyCache.set(familyId, family);
    return { family: family ?? null };
  } catch (err) {
    logError('getFamily', err, { familyId });
    return { family: null, error: 'Failed to fetch family' };
  }
}

function canUserJoinFamilyWithTier(
  user: AppUser,
  family: Family,
  currentSize: number
): JoinCheckResult {
  if (user.family_id === family.id) {
    return { allowed: false, reason: 'already_member', message: 'You are already a member of this family' };
  }
  if (user.family_id && user.family_id !== family.id) {
    return {
      allowed: false,
      reason: 'already_in_family',
      message: 'You are already in a different family. Leave your current family first.',
    };
  }
  const tier = family.tier ?? 'free';
  const max = family.max_members ?? TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  if (currentSize >= max) {
    const isTierIssue = tier === 'free';
    return {
      allowed: false,
      reason: isTierIssue ? 'tier_limit_reached' : 'family_full',
      message: isTierIssue
        ? `Your family has reached the ${tier} plan limit of ${max} members. Upgrade to add more.`
        : `Family is full (${max} members maximum).`,
    };
  }
  return { allowed: true };
}

const FAMILY_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class FamilyCache {
  private mem = new Map<string, CacheEntry<Family>>();
  private kv: any = null;

  constructor() { this._initKv(); }

  private async _initKv() {
    try {
      this.kv = await (Deno as any).openKv();
    } catch { /* KV not available — mem-only mode */ }
  }

  async get(id: string): Promise<Family | null> {
    const mem = this.mem.get(id);
    if (mem && mem.expiresAt > Date.now()) return mem.value;
    this.mem.delete(id);

    if (this.kv) {
      try {
        const entry = await this.kv.get<Family>(['family_cache', id]);
        if (entry.value) {
          this.mem.set(id, { value: entry.value, expiresAt: Date.now() + FAMILY_CACHE_TTL_MS });
          return entry.value;
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  async set(id: string, family: Family): Promise<void> {
    this.mem.set(id, { value: family, expiresAt: Date.now() + FAMILY_CACHE_TTL_MS });
    if (this.kv) {
      try {
        await this.kv.set(['family_cache', id], family, { expireIn: FAMILY_CACHE_TTL_MS });
      } catch { /* ignore */ }
    }
  }

  async invalidate(id: string): Promise<void> {
    this.mem.delete(id);
    if (this.kv) {
      try { await this.kv.delete(['family_cache', id]); } catch { /* ignore */ }
    }
  }
}

const familyCache = new FamilyCache();

async function invalidateFamilyCache(familyId: string): Promise<void> {
  await familyCache.invalidate(familyId);
}

interface RateLimitEntry { count: number; windowStart: number; }
const rlCache = new Map<string, RateLimitEntry>();

function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rlCache.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rlCache.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

async function rollbackJoin(
  base44: Base44Client,
  state: RollbackState,
  callerName: string
): Promise<void> {
  const errors: string[] = [];

  if (state.personId) {
    try {
      await base44.asServiceRole.entities.Person.delete(state.personId);
    } catch (err) {
      logError(callerName, err, { context: 'rollback_delete_person', personId: state.personId });
      errors.push('person_deletion_failed');
    }
  }

  try {
    await base44.asServiceRole.entities.User.update(state.userId, {
      family_id: state.originalFamilyId ?? null,
      family_role: null,
      linked_person_id: null,
    });
  } catch (err) {
    logError(callerName, err, { context: 'rollback_restore_user', userId: state.userId });
    errors.push('user_restoration_failed');
  }

  try {
    await base44.asServiceRole.entities.Family.update(state.familyId, {
      members: state.originalMembers,
      member_count: state.originalMembers.length,
    });
    await invalidateFamilyCache(state.familyId);
  } catch (err) {
    logError(callerName, err, { context: 'rollback_restore_family', familyId: state.familyId });
    errors.push('family_restoration_failed');
  }

  if (errors.length > 0) {
    logError(callerName, new Error('Rollback completed with errors'), { errors });
  } else {
    logInfo(callerName, 'Rollback completed successfully', { userId: state.userId, familyId: state.familyId });
  }
}

function logInfo(context: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: 'INFO', context, message, ...data, ts: new Date().toISOString() }));
}

function logError(context: string, error: unknown, data?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ level: 'ERROR', context, message, stack, ...data, ts: new Date().toISOString() }));
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

const CALLER = 'familyLinking';

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

async function handleJoinFamily(base44: Base44Client, user: AppUser, linkingCode: string) {
  const { valid, code: sanitizedCode, error: codeErr } = sanitizeCode(linkingCode);
  if (!valid) return typedErrorResponse('INVALID_CODE', codeErr ?? 'Invalid code format');

  const roleToAssign = isValidRole(user.family_role) ? user.family_role : 'child';

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

  if (family.linking_code_expires && isExpired(family.linking_code_expires)) {
    return typedErrorResponse('EXPIRED_CODE', 'This linking code has expired. Please ask your parent for a new code.');
  }

  const originalMembers = family.members ? [...family.members] : [];

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

  if (originalMembers.includes(user.id)) {
    return typedErrorResponse('ALREADY_MEMBER', 'You are already a member of this family');
  }

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

  try {
    await base44.asServiceRole.entities.User.update(user.id, {
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

  notifyParentsAsync(base44, user, family, roleToAssign);

  return successResponse({ familyName: family.name, familyId: family.id, personId: newPerson.id });
}

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

async function handleUnlinkAccount(base44: Base44Client, user: AppUser, personId: string) {
  if (!isParent(user)) return forbiddenResponse('Only parents can unlink accounts');

  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) return errorResponse('You are not part of any family');

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

  try {
    await base44.asServiceRole.entities.Person.update(personId, {
      linked_user_id: null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    logError(CALLER, err, { context: 'handleUnlinkAccount', personId });
    return errorResponse('Failed to unlink account. Please try again.', 500);
  }

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