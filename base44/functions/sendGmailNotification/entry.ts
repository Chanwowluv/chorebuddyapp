import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit, isValidEmail, isParent, getUserFamilyId } from './lib/shared-utils.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can send notifications
    if (!isParent(user)) {
      return Response.json({ 
        error: 'Forbidden: Only parents can send notifications' 
      }, { status: 403 });
    }

    // Rate limiting - max 10 emails per 10 minutes
    const rateLimit = checkRateLimit(user.id, 'gmail_notification', 10, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ 
        error: 'Too many email requests. Please try again later.',
        resetTime: rateLimit.resetTime 
      }, { status: 429 });
    }

    const { to, subject, body, notificationType, recipientUserId } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ 
        error: 'Missing required fields: to, subject, body' 
      }, { status: 400 });
    }

    // Validate recipient belongs to the same family
    if (recipientUserId) {
      const recipientUser = await base44.asServiceRole.entities.User.get(recipientUserId);
      const userFamilyId = getUserFamilyId(user);
      const recipientFamilyId = getUserFamilyId(recipientUser);
      
      if (!recipientUser || recipientFamilyId !== userFamilyId) {
        return Response.json({ 
          error: 'Forbidden: Recipient must be in the same family' 
        }, { status: 403 });
      }
    }

    // Validate email format
    if (!isValidEmail(to)) {
      return Response.json({ 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Create email in RFC 2822 format
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\r\n');

    // Encode email in base64url format
    const encodedEmail = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    const result = await response.json();

    return Response.json({
      success: true,
      messageId: result.id,
      notificationType
    });

  } catch (error) {
    console.error('Error sending Gmail notification:', error);
    return Response.json({ 
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
});