import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if called by a user (manual trigger) or by automation
    let familyIdFilter = null;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.family_role !== 'parent') {
          return Response.json({ error: 'Forbidden: Parent access required' }, { status: 403 });
        }
        familyIdFilter = user.family_id;
      }
    } catch (e) {
      // No user found, assume it's an automation running via service role
    }

    // Get recurring chores
    const filter = { is_recurring: true };
    if (familyIdFilter) {
      filter.family_id = familyIdFilter;
    }
    
    const chores = await base44.asServiceRole.entities.Chore.filter(filter);
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const todayDayOfWeek = today.getDay(); // 0 = Sunday
    const todayDayOfMonth = today.getDate();
    
    let assignmentsCreated = 0;
    const results = [];

    for (const chore of chores) {
      let shouldAssign = false;
      const lastAssigned = chore.last_auto_assigned_date;
      
      if (!lastAssigned || lastAssigned !== todayString) {
        switch (chore.recurrence_pattern) {
          case 'daily':
            shouldAssign = true;
            break;
          case 'weekly_same_day':
            if (chore.recurrence_day !== undefined && todayDayOfWeek === chore.recurrence_day) {
              shouldAssign = true;
            }
            break;
          case 'every_2_weeks':
            if (chore.recurrence_day !== undefined && todayDayOfWeek === chore.recurrence_day) {
              if (lastAssigned) {
                const lastDate = new Date(lastAssigned);
                const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 14) shouldAssign = true;
              } else {
                shouldAssign = true;
              }
            }
            break;
          case 'monthly_same_date':
            if (chore.recurrence_date !== undefined && todayDayOfMonth === chore.recurrence_date) {
              shouldAssign = true;
            }
            break;
          case 'custom':
            if (chore.custom_recurrence_days && chore.custom_recurrence_days.includes(todayDayOfWeek)) {
              shouldAssign = true;
            }
            break;
        }
      }

      if (shouldAssign) {
        let assignToPersonId = null;
        
        if (chore.assignment_method === 'manual_rotation' && chore.rotation_settings?.person_order?.length > 0) {
          const currentIndex = chore.rotation_settings.current_index || 0;
          assignToPersonId = chore.rotation_settings.person_order[currentIndex];
          
          const nextIndex = (currentIndex + 1) % chore.rotation_settings.person_order.length;
          await base44.asServiceRole.entities.Chore.update(chore.id, {
            'rotation_settings.current_index': nextIndex,
            'rotation_settings.last_assigned_date': todayString,
            last_auto_assigned_date: todayString
          });
        } else if (chore.assignment_method === 'ai_auto') {
          await base44.asServiceRole.entities.Chore.update(chore.id, {
            last_auto_assigned_date: todayString
          });
          results.push({ chore_id: chore.id, action: 'marked_for_choreai' });
          continue;
        }

        if (assignToPersonId) {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekStartString = weekStart.toISOString().split('T')[0];
          
          const existingAssignment = await base44.asServiceRole.entities.Assignment.filter({
            chore_id: chore.id,
            person_id: assignToPersonId,
            week_start: weekStartString
          });
          
          if (existingAssignment.length === 0) {
            const dueDate = new Date(today);
            switch (chore.frequency) {
              case 'daily': dueDate.setDate(today.getDate() + 1); break;
              case 'weekly': dueDate.setDate(today.getDate() + 7); break;
              case 'monthly': dueDate.setMonth(today.getMonth() + 1); break;
              default: dueDate.setDate(today.getDate() + 7);
            }
            
            await base44.asServiceRole.entities.Assignment.create({
              chore_id: chore.id,
              person_id: assignToPersonId,
              week_start: weekStartString,
              due_date: dueDate.toISOString().split('T')[0],
              family_id: chore.family_id,
              completed: false
            });
            
            assignmentsCreated++;
            results.push({ chore_id: chore.id, assigned_to: assignToPersonId, action: 'assigned' });
          } else {
            results.push({ chore_id: chore.id, action: 'skipped_duplicate' });
          }
        }
      }
    }

    return Response.json({
      success: true,
      processed_chores: chores.length,
      assignments_created: assignmentsCreated,
      results
    });
  } catch (error) {
    console.error('Error processing recurring chores:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});