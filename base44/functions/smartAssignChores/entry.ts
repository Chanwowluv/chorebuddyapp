import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isParent, getUserFamilyId, getUserSubscriptionTier } from './lib/shared-utils.ts';
import { advancedFairAssignment } from './lib/choreAssignment.ts';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { preview } = await req.json().catch(() => ({ preview: false }));
        
        let user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized. You must be logged in.' }), { 
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        // Only parents can use smart assignment
        if (!isParent(user)) {
            return new Response(JSON.stringify({ error: 'Forbidden: Only parents can use ChoreAI' }), { 
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        const familyId = getUserFamilyId(user);
        if (!familyId) {
            return new Response(JSON.stringify({ error: 'You must be part of a family to use ChoreAI.' }), { 
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        if (getUserSubscriptionTier(user) === 'free') {
            return new Response(JSON.stringify({ error: 'ChoreAI assignment requires a Basic or Premium plan.' }), { 
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        const [people, chores, existingAssignments, recentRewards] = await Promise.all([
            base44.asServiceRole.entities.Person.filter({ family_id: familyId }),
            base44.asServiceRole.entities.Chore.filter({ family_id: familyId }),
            base44.asServiceRole.entities.Assignment.filter({ family_id: familyId }),
            base44.asServiceRole.entities.Reward.filter({ family_id: familyId })
        ]);

        if (people.length === 0) {
            return new Response(JSON.stringify({ error: 'No family members found. Add family members first.' }), { 
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }
        if (chores.length === 0) {
            return new Response(JSON.stringify({ error: 'No chores found. Add some chores first.' }), { 
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { assignments: newAssignments, choreUpdates } = advancedFairAssignment(chores, people, existingAssignments, recentRewards);

        // If preview mode, return assignments without creating them
        if (preview) {
            // Add rotation update info to assignments for preview
            const assignmentsWithRotationInfo = newAssignments.map(a => {
                const choreUpdate = choreUpdates.find(cu => cu.id === a.chore_id);
                if (choreUpdate) {
                    return {
                        ...a,
                        rotation_update: {
                            newIndex: choreUpdate.rotation_current_index,
                            date: choreUpdate.rotation_last_assigned_date
                        }
                    };
                }
                return a;
            });

            return new Response(JSON.stringify({ 
                success: true,
                preview: true,
                assignments: assignmentsWithRotationInfo,
                count: newAssignments.length
            }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }

        // Create assignments and update chores atomically
        try {
            // Create assignments first
            if (newAssignments.length > 0) {
                await base44.asServiceRole.entities.Assignment.bulkCreate(newAssignments);
            }

            // Update rotation chores with new indices
            if (choreUpdates.length > 0) {
                await Promise.all(
                    choreUpdates.map(update => 
                        base44.asServiceRole.entities.Chore.update(update.id, {
                            rotation_current_index: update.rotation_current_index,
                            rotation_last_assigned_date: update.rotation_last_assigned_date
                        })
                    )
                );
            }
        } catch (assignError) {
            // If chore updates fail after assignments created, log warning but don't fail completely
            // Assignments are still valid, rotation indices will catch up next time
            console.error('Warning: Assignment created but rotation update failed:', assignError.message);
            
            return new Response(JSON.stringify({ 
                success: true, 
                created: newAssignments.length,
                rotations_updated: 0,
                warning: 'Assignments created but some rotation data may need manual update'
            }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }

        return new Response(JSON.stringify({ 
            success: true, 
            created: newAssignments.length,
            rotations_updated: choreUpdates.length 
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error('CRITICAL ERROR in smartAssignChores:', error.message, error.stack);
        return new Response(JSON.stringify({ error: "An internal server error occurred while assigning chores." }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
});