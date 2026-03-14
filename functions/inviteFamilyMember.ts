// functions/inviteFamilyMember.ts
// Handles family member invitations via email or linking codes
// Consolidates invitation logic and improves error handling

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  requireParent,
  getUserFamilyId,
  getFamily,
  updateEntityWithEnv,
  isValidEmail,
  isValidRole,
  generateCode,
  calculateExpiryDate,
  checkRateLimit,
  getUserSubscriptionTier,
  hasFeatureAccess,
  errorResponse,
  successResponse,
  logError,
  logInfo,
  parseRequestBody,
  SUBSCRIPTION_TIERS,
} from './lib/shared-utils.ts';

/**
 * Generate a user-specific linking code
 */
async function handleGenerateLinkingCode(
  base44: any,
  user: any,
  familyId: string,
  env: 'prod' | 'dev'
) {
  const family = await base44.asServiceRole.entities.Family.get(familyId);

  const linkingCode = generateCode(8);
  const linkingCodeExpires = calculateExpiryDate();

  const userLinkingCodes = family.user_linking_codes || {};

  // Add/update this user's linking code
  userLinkingCodes[user.id] = {
    code: linkingCode,
    expires: linkingCodeExpires,
  };

  // Update family
  await updateEntityWithEnv(
    base44,
    'Family',
    familyId,
    { user_linking_codes: userLinkingCodes },
    env
  );

  logInfo('inviteFamilyMember', 'Generated user linking code', { familyId, userId: user.id });

  return successResponse({
    linkingCode,
    linkingCodeExpires,
  });
}

/**
 * Send email invitation to new family member
 */
async function handleEmailInvitation(
  base44: any,
  user: any,
  familyId: string,
  email: string,
  name: string,
  role: string,
  env: 'prod' | 'dev'
) {
  // Generate unique invite code
  const inviteCode = `${familyId}-${Date.now()}-${generateCode(7)}`;

  // Update family with invite code
  await updateEntityWithEnv(base44, 'Family', familyId, { invite_code: inviteCode }, env);

  const appUrl = Deno.env.get('APP_URL') || 'https://chorebuddyapp.com';
  const joinUrl = `${appUrl}/JoinFamily?code=${inviteCode}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=${role}`;

  // Send invitation email
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2B59C3; font-size: 28px; margin: 0;">ChoreBuddy</h1>
        <p style="color: #5E3B85; font-size: 16px;">Making household chores fun for the whole family!</p>
      </div>
      
      <p style="font-size: 16px; color: #333;">Hello ${name},</p>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        You've been invited to join <strong>${user.full_name || user.email}'s family</strong> on ChoreBuddy! 
        Our app makes household chores fun and rewarding for everyone.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${joinUrl}" style="background-color: #FF6B35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666; line-height: 1.6;">
        Once you join, you'll be able to view your assigned chores, earn points for completing tasks, 
        and redeem rewards from your family's store!
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      
      <p style="font-size: 12px; color: #999; text-align: center;">
        Thanks,<br/>The ChoreBuddy Team<br/>
        <a href="${appUrl}" style="color: #5E3B85;">chorebuddyapp.com</a>
      </p>
    </div>
  `;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: email,
    from_name: 'ChoreBuddy',
    subject: `You're invited to join ${user.full_name || 'your family'} on ChoreBuddy!`,
    body: emailBody,
  });

  logInfo('inviteFamilyMember', 'Sent email invitation', {
    familyId,
    invitedEmail: email,
    invitedBy: user.id,
  });

  return successResponse({
    message: 'Invitation sent successfully',
  });
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Require parent authentication
    const { user, error: authError } = await requireParent(base44);
    if (authError) return authError;

    // Get family ID
    const familyId = getUserFamilyId(user);
    if (!familyId) {
      return errorResponse('No family found. Please set up your family first.');
    }

    // Rate limiting - max 10 invitations per 5 minutes
    const rateLimit = checkRateLimit(user.id, 'family_invitation', 10, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return errorResponse('Too many invitation requests. Please try again later.', 429);
    }

    // Get family with environment detection
    const { family, env } = await getFamily(base44, familyId);
    if (!family) {
      return errorResponse('Family not found', 404);
    }

    // Parse request body
    const { data: body, error: parseError } = await parseRequestBody(req);
    if (parseError) return parseError;

    const { email, name, role, generateLinkingCode } = body;

    // Handle linking code generation (available on all tiers)
    if (generateLinkingCode) {
      return await handleGenerateLinkingCode(base44, user, familyId, env);
    }

    // Email invitations require premium
    const subscriptionTier = getUserSubscriptionTier(user);
    const { allowed, requiredTier } = hasFeatureAccess(subscriptionTier, 'email_invitations');

    if (!allowed) {
      return errorResponse(
        `Email invitations require ${requiredTier} subscription`,
        403
      );
    }

    // Validate email invitation inputs
    if (!email || !name || !role) {
      return errorResponse('Email, name, and role are required for email invitations');
    }

    if (!isValidEmail(email)) {
      return errorResponse('Invalid email format');
    }

    if (!isValidRole(role)) {
      return errorResponse('Invalid role. Must be parent, teen, or child');
    }

    // Send email invitation
    return await handleEmailInvitation(base44, user, familyId, email, name, role, env);
  } catch (error) {
    logError('inviteFamilyMember', error);
    return errorResponse('An internal server error occurred', 500);
  }
});
