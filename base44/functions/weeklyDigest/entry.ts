import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { startOfWeek, endOfWeek, format } from 'npm:date-fns@3.6.0';
import { isParent } from './lib/shared-utils.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // This function should only be called by automation (no user context)
    // or by a parent for testing purposes
    const user = await base44.auth.me().catch(() => null);

    // If called by a user, verify they are a parent
    if (user && !isParent(user)) {
      return Response.json({
        error: 'Forbidden: Parent access required'
      }, { status: 403 });
    }

    const { familyId } = await req.json();

    if (!familyId) {
      return Response.json({ error: 'Family ID required' }, { status: 400 });
    }

    // Get family data
    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (!family) {
      return Response.json({ error: 'Family not found' }, { status: 404 });
    }

    // Get current week range
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    // Fetch data for this week
    const [assignments, people, chores, rewards, achievements] = await Promise.all([
      base44.asServiceRole.entities.Assignment.filter({ 
        family_id: familyId,
        week_start: weekStartStr 
      }),
      base44.asServiceRole.entities.Person.filter({ family_id: familyId }),
      base44.asServiceRole.entities.Chore.filter({ family_id: familyId }),
      base44.asServiceRole.entities.Reward.filter({ 
        family_id: familyId,
        week_start: weekStartStr 
      }),
      base44.asServiceRole.entities.Achievement.filter({ family_id: familyId })
    ]);

    // Calculate stats
    const totalChores = assignments.length;
    const completedChores = assignments.filter(a => a.completed).length;
    const completionRate = totalChores > 0 ? Math.round((completedChores / totalChores) * 100) : 0;

    // Get top performers
    const personPoints = {};
    rewards.forEach(r => {
      personPoints[r.person_id] = (personPoints[r.person_id] || 0) + r.points;
    });

    const leaderboard = people
      .map(p => ({
        name: p.name,
        points: personPoints[p.id] || 0,
        completed: assignments.filter(a => a.person_id === p.id && a.completed).length
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    // Recent achievements this week
    const recentAchievements = achievements
      .filter(a => new Date(a.earned_date) >= weekStart)
      .slice(0, 5);

    // Get all family members who have user accounts
    const familyUsers = await base44.asServiceRole.entities.User.filter({
      family_id: familyId
    });

    const emailRecipients = familyUsers
      .filter(u => u.receives_weekly_reports)
      .map(u => u.email);

    if (emailRecipients.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No recipients opted in for weekly digest' 
      });
    }

    // Build email HTML
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDFBF5;">
        <div style="background: white; border: 3px solid #5E3B85; border-radius: 24px; padding: 32px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2B59C3; font-size: 32px; margin: 0;">📊 Weekly Family Digest</h1>
            <p style="color: #5E3B85; font-size: 16px;">${family.name || 'Your Family'}</p>
            <p style="color: #666; font-size: 14px;">${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}</p>
          </div>

          <!-- Stats -->
          <div style="background: #C3B1E1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0;">This Week's Highlights</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: white;">${completedChores}</div>
                <div style="font-size: 12px; color: white;">Chores Done</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: white;">${completionRate}%</div>
                <div style="font-size: 12px; color: white;">Completion</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: white;">${Object.values(personPoints).reduce((a, b) => a + b, 0)}</div>
                <div style="font-size: 12px; color: white;">Points Earned</div>
              </div>
            </div>
          </div>

          <!-- Leaderboard -->
          ${leaderboard.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h2 style="color: #2B59C3; font-size: 20px; margin-bottom: 12px;">🏆 Top Performers</h2>
            ${leaderboard.map((person, index) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${index === 0 ? '#FFF4E6' : '#F9F9F9'}; border-radius: 12px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="font-size: 24px;">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                  <div>
                    <div style="font-weight: bold; color: #5E3B85;">${person.name}</div>
                    <div style="font-size: 12px; color: #666;">${person.completed} chores completed</div>
                  </div>
                </div>
                <div style="font-size: 20px; font-weight: bold; color: #FF6B35;">${person.points} pts</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Recent Achievements -->
          ${recentAchievements.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h2 style="color: #2B59C3; font-size: 20px; margin-bottom: 12px;">🎖️ New Badges Earned</h2>
            ${recentAchievements.map(a => {
              const person = people.find(p => p.id === a.person_id);
              return `
                <div style="padding: 8px; background: #F0F9FF; border-radius: 8px; margin-bottom: 8px; font-size: 14px;">
                  <strong>${person?.name}</strong> earned <span style="color: #2B59C3; font-weight: bold;">${a.badge_type.replace(/_/g, ' ')}</span>
                </div>
              `;
            }).join('')}
          </div>
          ` : ''}

          <!-- CTA -->
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 2px dashed #ddd;">
            <a href="https://chorebuddyapp.com/Dashboard" style="display: inline-block; background: #FF6B35; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
              View Dashboard
            </a>
          </div>

          <p style="text-align: center; font-size: 12px; color: #999; margin-top: 24px;">
            You're receiving this because you opted in to weekly reports.
            <br/>Manage preferences in your <a href="https://chorebuddyapp.com/Account" style="color: #5E3B85;">account settings</a>.
          </p>
        </div>
      </div>
    `;

    // Send emails
    for (const email of emailRecipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'ChoreBuddy',
        subject: `📊 ${family.name} Weekly Digest - ${format(now, 'MMM d, yyyy')}`,
        body: emailBody
      });
    }

    return Response.json({ 
      success: true, 
      sent: emailRecipients.length,
      stats: { totalChores, completedChores, completionRate }
    });

  } catch (error) {
    console.error('Error generating weekly digest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});