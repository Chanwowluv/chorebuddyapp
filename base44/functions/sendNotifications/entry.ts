import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, addDays, startOfWeek, isBefore, parseISO } from 'npm:date-fns@3.6.0';
import { TIME, APP } from './lib/shared-utils.ts';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Authentication check - require API key for scheduled jobs
        const authHeader = req.headers.get('Authorization');
        const apiKey = req.headers.get('X-API-Key');
        const expectedApiKey = Deno.env.get('NOTIFICATIONS_API_KEY');
        
        if (!expectedApiKey) {
            console.error('Security Alert: NOTIFICATIONS_API_KEY is not set in environment variables.');
            return Response.json({ 
                success: false, 
                error: 'Server configuration error: Notification service is not properly configured.' 
            }, { status: 500 });
        }

        // Check for API key in either Authorization header or X-API-Key header
        const providedKey = authHeader?.replace('Bearer ', '') || apiKey;
        
        if (!providedKey || providedKey !== expectedApiKey) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized: Valid API key required' 
            }, { status: 401 });
        }
        
        // Fetch all users for batch notification processing (service role, API key authenticated)
        // Each user's family data is fetched with family_id filter below
        const users = await base44.asServiceRole.entities.User.list();
        const currentDate = new Date();
        const currentWeekStart = format(startOfWeek(currentDate), "yyyy-MM-dd");
        
        let totalNotificationsSent = 0;
        
        for (const user of users) {
            // Skip users who don't want any notifications
            if (!user.receives_chore_reminders && !user.receives_achievement_alerts && !user.receives_weekly_reports) {
                continue;
            }
            
            if (!user.family_id) continue; // Skip users without families
            
            // Get user's family data
            const [people, assignments, chores, rewards] = await Promise.all([
                base44.asServiceRole.entities.Person.filter({ family_id: user.family_id }),
                base44.asServiceRole.entities.Assignment.filter({ family_id: user.family_id }),
                base44.asServiceRole.entities.Chore.filter({ family_id: user.family_id }),
                base44.asServiceRole.entities.Reward.filter({ family_id: user.family_id })
            ]);
            
            // CHORE REMINDERS
            if (user.receives_chore_reminders) {
                // Find overdue and due-soon assignments
                const overdueAssignments = assignments.filter(a => 
                    !a.completed && 
                    a.due_date && 
                    isBefore(parseISO(a.due_date), currentDate)
                );
                
                const dueSoonAssignments = assignments.filter(a => 
                    !a.completed && 
                    a.due_date && 
                    format(parseISO(a.due_date), "yyyy-MM-dd") === format(addDays(currentDate, 1), "yyyy-MM-dd")
                );
                
                if (overdueAssignments.length > 0 || dueSoonAssignments.length > 0) {
                    let emailBody = `<h2>🏠 ChoreBuddy Reminder</h2>`;
                    
                    if (overdueAssignments.length > 0) {
                        emailBody += `<h3>⚠️ Overdue Chores (${overdueAssignments.length})</h3><ul>`;
                        overdueAssignments.forEach(assignment => {
                            const chore = chores.find(c => c.id === assignment.chore_id);
                            const person = people.find(p => p.id === assignment.person_id);
                            emailBody += `<li><strong>${chore?.title}</strong> - ${person?.name} (Due: ${format(parseISO(assignment.due_date), "MMM d")})</li>`;
                        });
                        emailBody += `</ul>`;
                    }
                    
                    if (dueSoonAssignments.length > 0) {
                        emailBody += `<h3>📅 Due Tomorrow (${dueSoonAssignments.length})</h3><ul>`;
                        dueSoonAssignments.forEach(assignment => {
                            const chore = chores.find(c => c.id === assignment.chore_id);
                            const person = people.find(p => p.id === assignment.person_id);
                            emailBody += `<li><strong>${chore?.title}</strong> - ${person?.name}</li>`;
                        });
                        emailBody += `</ul>`;
                    }
                    
                    emailBody += `<p>Keep up the great work! 💪</p>`;
                    emailBody += `<p><a href="${APP.URL}/Dashboard">View Dashboard</a></p>`;
                    
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: user.email,
                        subject: `${APP.NAME}: ${overdueAssignments.length + dueSoonAssignments.length} chore${overdueAssignments.length + dueSoonAssignments.length > 1 ? 's' : ''} need${overdueAssignments.length + dueSoonAssignments.length === 1 ? 's' : ''} attention`,
                        body: emailBody,
                        from_name: APP.NAME
                    });
                    
                    totalNotificationsSent++;
                }
            }
            
            // ACHIEVEMENT ALERTS
            if (user.receives_achievement_alerts) {
                // Find recent completions (last 24 hours)
                const recentCompletions = assignments.filter(a => 
                    a.completed && 
                    a.completed_date &&
                    (new Date().getTime() - new Date(a.completed_date).getTime()) < TIME.ONE_DAY_MS
                );
                
                // Find recent high-point achievements
                const recentHighPointRewards = rewards.filter(r => 
                    r.points >= 50 && 
                    r.created_date &&
                    (new Date().getTime() - new Date(r.created_date).getTime()) < TIME.ONE_DAY_MS
                );
                
                if (recentCompletions.length >= 3 || recentHighPointRewards.length > 0) {
                    let emailBody = `<h2>🎉 ${APP.NAME} Achievements!</h2>`;
                    
                    if (recentCompletions.length >= 3) {
                        emailBody += `<p>🔥 <strong>Hot Streak!</strong> Your family completed ${recentCompletions.length} chores in the last 24 hours!</p>`;
                    }
                    
                    if (recentHighPointRewards.length > 0) {
                        emailBody += `<h3>🌟 High Achievers</h3><ul>`;
                        recentHighPointRewards.forEach(reward => {
                            const person = people.find(p => p.id === reward.person_id);
                            emailBody += `<li><strong>${person?.name}</strong> earned ${reward.points} points!</li>`;
                        });
                        emailBody += `</ul>`;
                    }
                    
                    emailBody += `<p>Keep up the amazing work! 🚀</p>`;
                    
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: user.email,
                        subject: `🎉 ${APP.NAME}: Family achievements unlocked!`,
                        body: emailBody,
                        from_name: APP.NAME
                    });
                    
                    totalNotificationsSent++;
                }
            }
            
            // WEEKLY REPORTS (Sundays only)
            if (user.receives_weekly_reports && currentDate.getDay() === 0) {
                const weekAssignments = assignments.filter(a => a.week_start === currentWeekStart);
                const completedThisWeek = weekAssignments.filter(a => a.completed);
                const totalPointsThisWeek = rewards
                    .filter(r => r.week_start === currentWeekStart && r.points > 0)
                    .reduce((sum, r) => sum + r.points, 0);
                
                let emailBody = `<h2>📊 Weekly ${APP.NAME} Report</h2>`;
                emailBody += `<h3>Week of ${format(startOfWeek(currentDate), "MMMM d, yyyy")}</h3>`;
                emailBody += `<p><strong>Family Stats:</strong></p>`;
                emailBody += `<ul>`;
                emailBody += `<li>Chores Completed: ${completedThisWeek.length}/${weekAssignments.length}</li>`;
                emailBody += `<li>Total Points Earned: ${totalPointsThisWeek}</li>`;
                emailBody += `<li>Completion Rate: ${weekAssignments.length > 0 ? Math.round((completedThisWeek.length / weekAssignments.length) * 100) : 0}%</li>`;
                emailBody += `</ul>`;
                
                // Top performer
                const personPoints = {};
                rewards.filter(r => r.week_start === currentWeekStart && r.points > 0).forEach(reward => {
                    personPoints[reward.person_id] = (personPoints[reward.person_id] || 0) + reward.points;
                });
                
                if (Object.keys(personPoints).length > 0) {
                    const topPerformerId = Object.keys(personPoints).reduce((a, b) => personPoints[a] > personPoints[b] ? a : b);
                    const topPerformer = people.find(p => p.id === topPerformerId);
                    
                    if (topPerformer) {
                        emailBody += `<p>🏆 <strong>Top Performer:</strong> ${topPerformer.name} with ${personPoints[topPerformerId]} points!</p>`;
                    }
                }
                
                emailBody += `<p><a href="${APP.URL}/Analytics">View Full Analytics</a></p>`;
                
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: user.email,
                    subject: `📊 Your ${APP.NAME} Weekly Report - ${format(currentDate, "MMM d, yyyy")}`,
                    body: emailBody,
                    from_name: APP.NAME
                });
                
                totalNotificationsSent++;
            }
        }
        
        return Response.json({ 
            success: true, 
            message: `Notifications processed successfully. ${totalNotificationsSent} notifications sent.`
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error sending notifications:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});