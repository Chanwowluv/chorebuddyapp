import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (event.type !== 'update' || event.entity_name !== 'ChoreCompletion') {
      return Response.json({ success: true, message: 'Ignored: not an update to ChoreCompletion' });
    }

    if (!data || !old_data) {
      return Response.json({ success: true, message: 'Ignored: missing data' });
    }

    // Check if status changed to approved
    if (data.completion_status === 'approved' && old_data.completion_status !== 'approved') {
      const personId = data.person_id;
      const familyId = data.family_id;
      const pointsToAward = data.points?.total_awarded || data.points?.base_points || 0;

      if (pointsToAward > 0) {
        // Create a Reward record to log the points earned
        await base44.asServiceRole.entities.Reward.create({
          person_id: personId,
          chore_id: data.chore_id,
          points: pointsToAward,
          reward_type: 'points',
          description: 'Points earned for completing chore',
          week_start: new Date().toISOString().split('T')[0],
          family_id: familyId
        });
      }

      // Update Person stats
      const person = await base44.asServiceRole.entities.Person.get(personId);
      if (person) {
        await base44.asServiceRole.entities.Person.update(personId, {
          chores_completed_count: (person.chores_completed_count || 0) + 1,
          current_streak: (person.current_streak || 0) + 1,
        });
      }

      // Update Assignment to completed
      if (data.assignment_id) {
        await base44.asServiceRole.entities.Assignment.update(data.assignment_id, {
          completed: true,
          completed_date: new Date().toISOString(),
          approval_status: 'approved',
          points_awarded: pointsToAward
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in awardPointsAndUpdateStats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});