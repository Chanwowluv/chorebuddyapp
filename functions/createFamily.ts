import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const subscription_tier = body.subscription_tier || 'free';

    // 1. Create Family
    const newFamily = await base44.asServiceRole.entities.Family.create({
      name: `${user.full_name || 'My'}'s Family`,
      owner_user_id: user.id,
      members: [user.id],
      member_count: 1,
      subscription_tier: subscription_tier,
      subscription_status: 'active',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      currency: 'USD',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 2. Create Person
    const parentPerson = await base44.asServiceRole.entities.Person.create({
      name: user.full_name || 'Parent',
      family_id: newFamily.id,
      linked_user_id: user.id,
      family_name: newFamily.name,
      role: 'parent',
      is_active: true,
      points_balance: 0,
      total_points_earned: 0,
      chores_completed_count: 0,
      current_streak: 0,
      best_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 3. SECURELY update User entity via Service Role
    await base44.asServiceRole.entities.User.update(user.id, {
      family_id: newFamily.id,
      family_role: 'parent',
      linked_person_id: parentPerson.id
    });

    return Response.json({ success: true, familyId: newFamily.id });
  } catch (error) {
    console.error("Error creating family:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});