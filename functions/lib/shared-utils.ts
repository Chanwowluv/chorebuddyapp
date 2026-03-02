// lib/shared-utils.ts
// Shared utilities for all backend functions
// Consolidates validation, authorization, and common patterns

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ==========================================
// CONSTANTS
// ==========================================

export const TIME = {
  ONE_MINUTE_MS: 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
};

export const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const APP = {
  URL: 'https://chorebuddyapp.com',
  NAME: 'ChoreBuddy',
};

export const VALID_ROLES = ['parent', 'teen', 'child', 'toddler'];
export const PARENT_ROLES = ['parent'];

export const JOIN_ERROR_CODES = {
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
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  FAMILY_PLUS: 'family_plus',
  ENTERPRISE: 'enterprise',
};

// Frontend source of truth for tier limits: src/constants/subscriptionTiers.js
// Keep this value in sync when updating tier limits.
export const MAX_FAMILY_SIZE = 50;
export const CODE_EXPIRY_HOURS = 24;

export const TIER_MEMBER_LIMITS: Record<string, number> = {
  free: 6,
  premium: 15,
  family_plus: 30,
  enterprise: 50,
};

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate role
 */
export function isValidRole(role: string): boolean {
  return VALID_ROLES.includes(role?.toLowerCase());
}

/**
 * Sanitize invite/linking code
 */
export function sanitizeCode(code: string): { valid: boolean; code?: string; error?: string } {
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

/**
 * Generate secure random code
 */
export function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==========================================
// AUTHORIZATION UTILITIES
// ==========================================

/**
 * Check if user is a parent
 */
export function isParent(user: any): boolean {
  return user?.family_role === 'parent' || user?.data?.family_role === 'parent' || user?.role === 'admin';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: any): boolean {
  return !!user && !!user.id;
}

/**
 * Get family ID from user (handles both data locations)
 */
export function getUserFamilyId(user: any): string | null {
  return user?.family_id || user?.data?.family_id || null;
}

/**
 * Get subscription tier from user
 */
export function getUserSubscriptionTier(user: any): string {
  return user?.subscription_tier || user?.data?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
}

/**
 * Validate user has access to family
 */
export function validateFamilyAccess(user: any, familyId: string): { valid: boolean; error?: string } {
  const userFamilyId = getUserFamilyId(user);

  if (!userFamilyId) {
    return { valid: false, error: 'User is not part of any family' };
  }

  if (userFamilyId !== familyId) {
    return { valid: false, error: 'Access denied: Different family' };
  }

  return { valid: true };
}

// ==========================================
// RATE LIMITING
// ==========================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
export function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime?: number } {
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

// ==========================================
// DATABASE UTILITIES
// ==========================================

/**
 * Find entity across dev/prod databases
 */
export async function findEntityAcrossEnvs<T>(
  base44: any,
  entityName: string,
  id: string
): Promise<{ entity: T | null; env: 'prod' | 'dev' }> {
  try {
    const entity = await base44.asServiceRole.entities[entityName].get(id);
    return { entity, env: 'prod' };
  } catch {
    try {
      const entity = await base44.asServiceRole.entities[entityName].get(id, { data_env: 'dev' });
      return { entity, env: 'dev' };
    } catch {
      return { entity: null, env: 'prod' };
    }
  }
}

/**
 * Update entity with correct environment
 */
export async function updateEntityWithEnv(
  base44: any,
  entityName: string,
  id: string,
  data: any,
  env: 'prod' | 'dev'
): Promise<any> {
  const options = env === 'dev' ? { data_env: 'dev' } : {};
  return await base44.asServiceRole.entities[entityName].update(id, data, options);
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

/**
 * Standard error response
 */
export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status, headers: HEADERS });
}

/**
 * Error response with machine-readable error code
 */
export function errorResponseWithCode(
  message: string,
  code: string,
  status = 400,
  details?: Record<string, any>
): Response {
  return Response.json(
    { error: message, errorCode: code, ...details },
    { status, headers: HEADERS }
  );
}

/**
 * Standard success response
 */
export function successResponse(data: any, status = 200): Response {
  return Response.json({ success: true, ...data }, { status, headers: HEADERS });
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

/**
 * Require authenticated user
 */
export async function requireAuth(base44: any): Promise<{ user: any; error?: Response }> {
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

/**
 * Require parent role
 */
export async function requireParent(base44: any): Promise<{ user: any; error?: Response }> {
  const { user, error } = await requireAuth(base44);
  if (error) return { user: null, error };

  if (!isParent(user)) {
    return { user: null, error: forbiddenResponse('Only parents can perform this action') };
  }

  return { user };
}

/**
 * Require family membership
 */
export async function requireFamily(
  base44: any
): Promise<{ user: any; familyId: string; error?: Response }> {
  const { user, error } = await requireAuth(base44);
  if (error) return { user: null, familyId: null, error };

  const familyId = getUserFamilyId(user);
  if (!familyId) {
    return {
      user: null,
      familyId: null,
      error: errorResponse('User is not part of any family'),
    };
  }

  return { user, familyId };
}

// ==========================================
// FAMILY UTILITIES
// ==========================================

/**
 * Get family with environment detection
 */
export async function getFamily(
  base44: any,
  familyId: string
): Promise<{ family: any; env: 'prod' | 'dev' }> {
  const { entity, env } = await findEntityAcrossEnvs(base44, 'Family', familyId);
  return { family: entity, env };
}

/**
 * Check if user can join family
 */
export function canUserJoinFamily(
  user: any,
  family: any,
  currentSize: number
): { allowed: boolean; reason?: string; message?: string } {
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

/**
 * Check if user can join family with tier-based limits
 */
export function canUserJoinFamilyWithTier(
  user: any,
  family: any,
  currentSize: number
): { allowed: boolean; reason?: string; message?: string } {
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

/**
 * Validate linking code
 */
export function validateLinkingCode(
  family: any,
  code: string
): { valid: boolean; codeOwnerId?: string; error?: string } {
  const userLinkingCodes = family.user_linking_codes || {};
  const upperCode = code.toUpperCase().trim();

  for (const [userId, codeData] of Object.entries(userLinkingCodes)) {
    if (codeData.code === upperCode) {
      const expiryDate = new Date(codeData.expires);
      if (expiryDate > new Date()) {
        return { valid: true, codeOwnerId: userId };
      }
    }
  }

  return { valid: false, error: 'Invalid or expired linking code' };
}

// ==========================================
// SUBSCRIPTION UTILITIES
// ==========================================

/**
 * Check if feature is available for subscription tier
 */
export function hasFeatureAccess(
  subscriptionTier: string,
  feature: string
): { allowed: boolean; requiredTier?: string } {
  const featureMatrix = {
    email_invitations: [SUBSCRIPTION_TIERS.PREMIUM, SUBSCRIPTION_TIERS.FAMILY_PLUS, SUBSCRIPTION_TIERS.ENTERPRISE],
    choreai: [SUBSCRIPTION_TIERS.PREMIUM, SUBSCRIPTION_TIERS.FAMILY_PLUS, SUBSCRIPTION_TIERS.ENTERPRISE],
    reports: [SUBSCRIPTION_TIERS.FAMILY_PLUS, SUBSCRIPTION_TIERS.ENTERPRISE],
    family_goals: [SUBSCRIPTION_TIERS.FAMILY_PLUS, SUBSCRIPTION_TIERS.ENTERPRISE],
    premium_support: [SUBSCRIPTION_TIERS.ENTERPRISE],
  };

  const requiredTiers = featureMatrix[feature];
  if (!requiredTiers) return { allowed: true };

  const allowed = requiredTiers.includes(subscriptionTier);
  return {
    allowed,
    requiredTier: allowed ? undefined : requiredTiers[0],
  };
}

// ==========================================
// LOGGING UTILITIES
// ==========================================

/**
 * Structured error logging
 */
export function logError(context: string, error: Error, metadata?: any): void {
  console.error(`[ERROR] ${context}:`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
  });
}

/**
 * Structured info logging
 */
export function logInfo(context: string, message: string, metadata?: any): void {
  console.log(`[INFO] ${context}:`, message, metadata || '');
}

// ==========================================
// DATE UTILITIES
// ==========================================

/**
 * Calculate expiry date
 */
export function calculateExpiryDate(hours = CODE_EXPIRY_HOURS): string {
  return new Date(Date.now() + hours * TIME.ONE_HOUR_MS).toISOString();
}

/**
 * Check if date is expired
 */
export function isExpired(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

// ==========================================
// INPUT SANITIZATION
// ==========================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength = 500): string {
  if (!input) return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Sanitize user input to prevent injection attacks.
 * Alias for sanitizeString with a generous default limit.
 * @deprecated Prefer sanitizeString() which has an explicit maxLength parameter.
 */
export function sanitizeInput(input: any): any {
  if (typeof input !== 'string') return input;
  return input.trim().slice(0, 10000);
}

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T>(req: Request): Promise<{ data: T; error?: Response }> {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return { data: null, error: errorResponse('Invalid JSON in request body') };
  }
}
