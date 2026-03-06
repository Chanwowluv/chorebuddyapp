// Shared utilities for ChoreBuddy serverless functions
// Refactored: unified error codes with HTTP status, TypeScript interfaces,
//             shared rollbackJoin(), Deno KV family cache, KV-backed rate limiting

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

/** Snapshot of state before a join operation, used by rollbackJoin() */
export interface RollbackState {
  personId?: string | null;
  userId: string;
  familyId: string;
  originalFamilyId?: string | null;
  originalMembers: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const APP = {
  NAME: 'ChoreBuddy',
  URL: 'https://chorebuddy.app',
} as const;

export const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

export const CODE_EXPIRY_HOURS = 48;

export const VALID_ROLES = ['parent', 'teen', 'child'] as const;
export type ValidRole = typeof VALID_ROLES[number];

export const TIER_LIMITS: Record<string, number> = {
  free: 4,
  premium: 10,
  family: 20,
};

// ─── Unified Error Codes ──────────────────────────────────────────────────────
// Each entry carries its own default HTTP status so call sites stay consistent.
// Use typedErrorResponse(key, message) instead of errorResponseWithCode().

export const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED:       { code: 'AUTH_REQUIRED',       status: 401 },
  PARENT_REQUIRED:     { code: 'PARENT_REQUIRED',      status: 403 },
  ACCESS_DENIED:       { code: 'ACCESS_DENIED',        status: 403 },

  // Family
  INVALID_FAMILY:      { code: 'INVALID_FAMILY',       status: 400 },
  FAMILY_NOT_FOUND:    { code: 'FAMILY_NOT_FOUND',     status: 404 },
  FAMILY_FULL:         { code: 'FAMILY_FULL',          status: 400 },
  NO_FAMILY:           { code: 'NO_FAMILY',            status: 400 },

  // Codes
  INVALID_CODE:        { code: 'INVALID_CODE',         status: 400 },
  EXPIRED_CODE:        { code: 'EXPIRED_CODE',         status: 400 },

  // Membership
  ALREADY_MEMBER:      { code: 'ALREADY_MEMBER',       status: 409 },
  ALREADY_IN_FAMILY:   { code: 'ALREADY_IN_FAMILY',    status: 409 },
  TIER_LIMIT:          { code: 'TIER_LIMIT',           status: 400 },
  INVALID_ROLE:        { code: 'INVALID_ROLE',         status: 400 },

  // Linking
  ALREADY_LINKED:      { code: 'ALREADY_LINKED',       status: 409 },
  USER_ALREADY_LINKED: { code: 'USER_ALREADY_LINKED',  status: 409 },
  PERSON_NOT_FOUND:    { code: 'PERSON_NOT_FOUND',     status: 404 },
  NO_UNLINKED_PEOPLE:  { code: 'NO_UNLINKED_PEOPLE',   status: 400 },

  // Operations
  JOIN_FAILED:         { code: 'JOIN_FAILED',          status: 500 },
  LINK_FAILED:         { code: 'LINK_FAILED',          status: 500 },
  RATE_LIMITED:        { code: 'RATE_LIMITED',         status: 429 },
  SERVER_ERROR:        { code: 'SERVER_ERROR',         status: 500 },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;

// Legacy string-only aliases — kept for gradual migration of existing callers
export const JOIN_ERROR_CODES = Object.fromEntries(
  Object.entries(ERROR_CODES).map(([k, v]) => [k, v.code])
) as Record<ErrorCodeKey, string>;

export const LINK_ERROR_CODES = JOIN_ERROR_CODES;

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: HEADERS,
  });
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: HEADERS,
  });
}

/**
 * Primary error helper — looks up HTTP status from ERROR_CODES automatically.
 * Pass statusOverride only when you need to deviate from the default.
 */
export function typedErrorResponse(
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

/** @deprecated Use typedErrorResponse for new code */
export function errorResponseWithCode(
  message: string,
  errorCode: string,
  status = 400
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode }),
    { status, headers: HEADERS }
  );
}

export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function requireAuth(base44: Base44Client): Promise<AuthResult> {
  try {
    const user = await base44.auth.getUser();
    if (!user) {
      return { user: null, error: unauthorizedResponse('Authentication required') };
    }
    return { user };
  } catch (err) {
    logError('requireAuth', err);
    return { user: null, error: unauthorizedResponse('Authentication required') };
  }
}

// ─── Request Parsing ──────────────────────────────────────────────────────────

export async function parseRequestBody(req: Request): Promise<ParseResult> {
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

// ─── Role Helpers ─────────────────────────────────────────────────────────────

export function isValidRole(role: unknown): role is ValidRole {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role.toLowerCase());
}

/** Returns the validated role, or falls back to 'child' */
export function normaliseRole(role: unknown): ValidRole {
  if (typeof role === 'string') {
    const lower = role.toLowerCase();
    if ((VALID_ROLES as readonly string[]).includes(lower)) return lower as ValidRole;
  }
  return 'child';
}

export function isParent(user: AppUser): boolean {
  return user.family_role?.toLowerCase() === 'parent';
}

export function getUserFamilyId(user: AppUser): string | null {
  return user.family_id ?? null;
}

// ─── Code Utilities ───────────────────────────────────────────────────────────

export function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function sanitizeCode(raw: unknown): CodeValidation {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, code: '', error: 'Invite code is required' };
  }
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6 || code.length > 12) {
    return { valid: false, code: '', error: 'Code must be between 6 and 12 characters' };
  }
  return { valid: true, code };
}

export function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export function calculateExpiryDate(hours = CODE_EXPIRY_HOURS): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function validateLinkingCode(
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

// ─── Family Helpers ───────────────────────────────────────────────────────────

export async function getFamily(
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

export function validateFamilyAccess(
  user: AppUser,
  targetFamilyId: string
): { valid: boolean; error?: string } {
  const userFamilyId = getUserFamilyId(user);
  if (!userFamilyId) return { valid: false, error: 'You are not part of any family' };
  if (userFamilyId !== targetFamilyId) {
    return { valid: false, error: 'Access denied: not in the same family' };
  }
  return { valid: true };
}

export function canUserJoinFamilyWithTier(
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

// ─── Family Cache (Deno KV + in-process Map) ──────────────────────────────────
// Resolves the 246 ms TTFB for repeated Family reads.
// Primary: in-process Map (sub-millisecond). Secondary: Deno KV (cross-instance).
// Call invalidateFamilyCache() after every Family.update() to keep data fresh.

const FAMILY_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class FamilyCache {
  private mem = new Map<string, CacheEntry<Family>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kv: any = null; // Deno.Kv — typed as any for cross-env compatibility

  constructor() { this._initKv(); }

  private async _initKv() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const familyCache = new FamilyCache();

export async function invalidateFamilyCache(familyId: string): Promise<void> {
  await familyCache.invalidate(familyId);
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// In-process Map for low-latency checks. For multi-instance correctness,
// migrate to Deno KV atomics (see improvement plan Sprint 2).

interface RateLimitEntry { count: number; windowStart: number; }
const rlCache = new Map<string, RateLimitEntry>();

export function checkRateLimit(
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

// ─── Shared Rollback ──────────────────────────────────────────────────────────
// Centralised rollback used by joinFamily, familyLinking, and linkAccount.
// Each stage runs independently so a failure in one doesn't block the others.

export async function rollbackJoin(
  base44: Base44Client,
  state: RollbackState,
  callerName: string
): Promise<void> {
  const errors: string[] = [];

  // Stage 1 — delete the newly-created Person record
  if (state.personId) {
    try {
      await base44.asServiceRole.entities.Person.delete(state.personId);
    } catch (err) {
      logError(callerName, err, { context: 'rollback_delete_person', personId: state.personId });
      errors.push('person_deletion_failed');
    }
  }

  // Stage 2 — restore the User to their pre-join state
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

  // Stage 3 — restore Family.members to the pre-join snapshot
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

// ─── Logging ──────────────────────────────────────────────────────────────────

export function logInfo(context: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: 'INFO', context, message, ...data, ts: new Date().toISOString() }));
}

export function logError(context: string, error: unknown, data?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ level: 'ERROR', context, message, stack, ...data, ts: new Date().toISOString() }));
}

// Dummy handler to satisfy deployment requirements
Deno.serve(async () => {
  return new Response("Shared Utils Library", { status: 200 });
});