import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (event.type !== 'create' || event.entity_name !== 'Reward') {
      return Response.json({ success: true, message: 'Ignored' });
    }

    if (!data) return Response.json({ success: true });

    const personId = data.person_id;
    const points = data.points || 0;
    const familyId = data.family_id;

    if (points === 0) return Response.json({ success: true });

    // Only update Person points here if it's NOT from a chore completion.
    // Chore completions handle their own Person updates atomically.
    if (!data.chore_id) {
      const person = await base44.asServiceRole.entities.Person.get(personId);
      if (person) {
        const updates = {
          points_balance: (person.points_balance || 0) + points
        };
        if (points > 0) {
          updates.total_points_earned = (person.total_points_earned || 0) + points;
        }
        await base44.asServiceRole.entities.Person.update(personId, updates);
      }
    }

    // Update Family Goals if points were earned
    if (points > 0 && familyId) {
      const activeGoals = await base44.asServiceRole.entities.FamilyGoal.filter({
        family_id: familyId,
        status: 'active'
      });

      for (const goal of activeGoals) {
        const newCurrent = (goal.current_points || 0) + points;
        const updates = { current_points: newCurrent };
        
        if (newCurrent >= goal.target_points) {
          updates.status = 'completed';
          updates.completed_date = new Date().toISOString();
        }
        
        await base44.asServiceRole.entities.FamilyGoal.update(goal.id, updates);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in updatePersonPointsAndGoals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});