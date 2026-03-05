import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { format, subWeeks, parseISO } from 'npm:date-fns@3.6.0';
import { isParent, getUserSubscriptionTier } from './lib/shared-utils.ts';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();

        if (!user || !user.family_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only parents can generate reports
        if (!isParent(user)) {
            return Response.json({ error: 'Forbidden: Only parents can generate reports' }, { status: 403 });
        }

        const reportTiers = ['family_plus'];
        if (!reportTiers.includes(getUserSubscriptionTier(user))) {
            return Response.json({ error: 'Report generation requires a Family Plus subscription.' }, { status: 403 });
        }

        const { payload } = await req.json();
        const { timeRange = '4weeks' } = payload;

        // Use service role for better performance
        const [assignments, chores, people, rewards] = await Promise.all([
            base44.asServiceRole.entities.Assignment.filter({ family_id: user.family_id }),
            base44.asServiceRole.entities.Chore.filter({ family_id: user.family_id }),
            base44.asServiceRole.entities.Person.filter({ family_id: user.family_id }),
            base44.asServiceRole.entities.Reward.filter({ family_id: user.family_id })
        ]);

        const now = new Date();
        const numWeeks = { '1week': 1, '4weeks': 4, '12weeks': 12 }[timeRange] || 4;
        const startDate = subWeeks(now, numWeeks);
        const filteredAssignments = assignments.filter(a => parseISO(a.week_start) >= startDate);

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(24);
        doc.setTextColor(43, 89, 195);
        doc.text('ChoreBuddy Family Report', 20, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(`Generated: ${format(now, 'PPP')}`, 20, 30);
        doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(now, 'MMM d, yyyy')}`, 20, 38);

        // Summary Section
        let yPos = 60;
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text('Summary', 20, yPos);
        yPos += 15;
        
        const total = filteredAssignments.length;
        const completed = filteredAssignments.filter(a => a.completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalPoints = rewards.filter(r => parseISO(r.created_date) >= startDate).reduce((sum, r) => sum + (r.points > 0 ? r.points : 0), 0);
        
        doc.setFontSize(12);
        doc.setTextColor(55, 65, 81);
        doc.text(`Total Chores: ${total}`, 25, yPos);
        doc.text(`Completed: ${completed}`, 80, yPos);
        doc.text(`Completion Rate: ${rate}%`, 135, yPos);
        yPos += 10;
        doc.text(`Total Points Earned: ${totalPoints}`, 25, yPos);

        // Individual Performance
        yPos += 25;
        doc.setFontSize(16);
        doc.text('Individual Performance', 20, yPos);
        yPos += 15;

        people.forEach(person => {
            if (yPos > 270) { 
                doc.addPage(); 
                yPos = 20; 
            }
            
            const pAssignments = filteredAssignments.filter(a => a.person_id === person.id);
            const pCompleted = pAssignments.filter(a => a.completed).length;
            const pPoints = rewards.filter(r => r.person_id === person.id && parseISO(r.created_date) >= startDate).reduce((sum, r) => sum + r.points, 0);
            const pRate = pAssignments.length > 0 ? Math.round((pCompleted / pAssignments.length) * 100) : 0;
            
            doc.setFontSize(14);
            doc.setTextColor(43, 89, 195);
            doc.text(person.name, 20, yPos);
            
            yPos += 8;
            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);
            doc.text(`Completed: ${pCompleted}/${pAssignments.length}  |  Rate: ${pRate}%  |  Points: ${pPoints}`, 25, yPos);
            yPos += 15;
        });

        // Chore Breakdown
        if (yPos > 200) { 
            doc.addPage(); 
            yPos = 20; 
        } else {
            yPos += 20;
        }
        
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text('Chore Breakdown', 20, yPos);
        yPos += 15;

        const choreStats = {};
        chores.forEach(chore => {
            const choreAssignments = filteredAssignments.filter(a => a.chore_id === chore.id);
            const choreCompleted = choreAssignments.filter(a => a.completed).length;
            choreStats[chore.title] = {
                total: choreAssignments.length,
                completed: choreCompleted,
                rate: choreAssignments.length > 0 ? Math.round((choreCompleted / choreAssignments.length) * 100) : 0
            };
        });

        Object.entries(choreStats).forEach(([choreTitle, stats]) => {
            if (yPos > 270) { 
                doc.addPage(); 
                yPos = 20; 
            }
            
            doc.setFontSize(11);
            doc.setTextColor(55, 65, 81);
            doc.text(`${choreTitle}: ${stats.completed}/${stats.total} (${stats.rate}%)`, 25, yPos);
            yPos += 8;
        });

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: { 
                'Content-Type': 'application/pdf', 
                'Content-Disposition': `attachment; filename=chorebuddy-report-${format(now, 'yyyy-MM-dd')}.pdf` 
            }
        });

    } catch (error) {
        console.error('Report generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});