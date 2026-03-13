import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, title: "Rookie", icon: "🌱" },
  { level: 2, minPoints: 100, title: "Helper", icon: "🧹" },
  { level: 3, minPoints: 300, title: "Pro", icon: "⭐" },
  { level: 4, minPoints: 600, title: "Star", icon: "🌟" },
  { level: 5, minPoints: 1000, title: "Champion", icon: "🏆" },
  { level: 6, minPoints: 2000, title: "Legend", icon: "👑" },
];

function getLevelForPoints(totalPoints) {
  let currentLevel = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalPoints >= threshold.minPoints) {
      currentLevel = threshold;
    } else {
      break;
    }
  }
  return { level: currentLevel.level, title: currentLevel.title, icon: currentLevel.icon };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'parent') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignment_id } = await req.json();
    if (!assignment_id) {
      return Response.json({ error: 'assignment_id is required' }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.Assignment.get(assignment_id);
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.approval_status === 'approved') {
      return Response.json({ success: true, new_badges: [], level_changed: false });
    }

    const chore = await base44.asServiceRole.entities.Chore.get(assignment.chore_id);
    const person = await base44.asServiceRole.entities.Person.get(assignment.person_id);
    const family = await base44.asServiceRole.entities.Family.get(assignment.family_id);

    if (!chore || !person || !family) {
      return Response.json({ error: 'Related entities not found' }, { status: 404 });
    }

    // Calculate points
    const pointMap = { easy: 10, medium: 20, hard: 30 };
    const basePoints = chore.custom_points || pointMap[chore.difficulty] || 15;
    const pointsToAward = Math.round(basePoints * (assignment.bonus_multiplier || 1));

    // Update assignment
    const now = new Date();
    await base44.asServiceRole.entities.Assignment.update(assignment_id, {
      approval_status: 'approved',
      approved_by: user.id,
      approved_date: now.toISOString(),
      points_awarded: pointsToAward
    });

    // Update chore completion if it exists
    const completions = await base44.asServiceRole.entities.ChoreCompletion.filter({ assignment_id: assignment_id });
    if (completions && completions.length > 0) {
      await base44.asServiceRole.entities.ChoreCompletion.update(completions[0].id, {
        completion_status: 'approved',
        points: { total_awarded: pointsToAward }
      });
    }

    // Create Reward
    if (pointsToAward > 0) {
      await base44.asServiceRole.entities.Reward.create({
        person_id: person.id,
        chore_id: chore.id,
        points: pointsToAward,
        reward_type: 'points',
        description: `Approved: ${chore.title}`,
        week_start: assignment.week_start,
        family_id: family.id
      });
    }

    // Streak update
    const tz = family.timezone || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    
    const getTzDateStr = (dateObj) => {
      const parts = formatter.formatToParts(dateObj);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    };

    const nowStr = getTzDateStr(now);

    let lastStr = null;
    if (person.last_chore_completed_at) {
      lastStr = getTzDateStr(new Date(person.last_chore_completed_at));
    }

    let currentStreak = person.current_streak || 0;
    
    if (lastStr) {
      const nowDateObj = new Date(nowStr);
      const lastDateObj = new Date(lastStr);
      const diffTime = Math.abs(nowDateObj.getTime() - lastDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    const bestStreak = Math.max(person.best_streak || 0, currentStreak);
    const newChoresCount = (person.chores_completed_count || 0) + 1;
    const newPointsBalance = (person.points_balance || 0) + pointsToAward;
    const newTotalPoints = (person.total_points_earned || 0) + pointsToAward;

    // Level update
    const levelInfo = getLevelForPoints(newTotalPoints);
    const oldLevel = person.level || 1;
    const levelChanged = levelInfo.level > oldLevel;

    // Badge checks
    const existingBadges = await base44.asServiceRole.entities.Badge.filter({ person_id: person.id });
    const existingBadgeTypes = new Set(existingBadges.map(b => b.badge_type));
    
    const badgesToAward = [];
    const checkAndAward = (type, title, icon, condition, metadata = {}) => {
      if (condition && !existingBadgeTypes.has(type)) {
        badgesToAward.push({ type, title, icon, metadata });
      }
    };

    checkAndAward('first_chore', 'First Steps', '👣', newChoresCount === 1);
    checkAndAward('streak_3', 'On a Roll', '🔥', currentStreak >= 3);
    checkAndAward('streak_7', 'Week Warrior', '💪', currentStreak >= 7);
    checkAndAward('streak_14', 'Unstoppable', '⚡', currentStreak >= 14);
    checkAndAward('streak_30', 'Streak Master', '🌋', currentStreak >= 30);
    checkAndAward('chores_10', 'Getting Started', '🧹', newChoresCount >= 10);
    checkAndAward('chores_25', 'Chore Champ', '🥈', newChoresCount >= 25);
    checkAndAward('chores_50', 'Half Century', '🥇', newChoresCount >= 50);
    checkAndAward('chores_100', 'Centurion', '💯', newChoresCount >= 100);
    checkAndAward('points_100', 'Point Collector', '💰', newTotalPoints >= 100);
    checkAndAward('points_500', 'Point Hoarder', '💎', newTotalPoints >= 500);
    checkAndAward('points_1000', 'Point Legend', '👑', newTotalPoints >= 1000);
    checkAndAward('level_up', 'Level Up!', '⬆️', levelChanged, { newLevel: levelInfo.level });

    // Check category master (10+ in a category)
    if (chore.category && !existingBadgeTypes.has('category_master')) {
      const categoryCompletions = await base44.asServiceRole.entities.ChoreCompletion.filter({
        person_id: person.id,
        completion_status: 'approved'
      });
      
      const categoryChores = await base44.asServiceRole.entities.Chore.filter({
        family_id: family.id,
        category: chore.category
      });
      const categoryChoreIds = new Set(categoryChores.map(c => c.id));
      
      let categoryCount = 0;
      for (const comp of categoryCompletions) {
        if (categoryChoreIds.has(comp.chore_id)) {
          categoryCount++;
        }
      }
      
      checkAndAward('category_master', 'Category Master', '🎯', categoryCount >= 10, { category: chore.category });
    }

    // Create the badges
    for (const b of badgesToAward) {
      await base44.asServiceRole.entities.Badge.create({
        person_id: person.id,
        family_id: family.id,
        badge_type: b.type,
        badge_title: b.title,
        badge_icon: b.icon,
        earned_at: now.toISOString(),
        metadata: JSON.stringify(b.metadata)
      });
    }

    const newBadgesCount = (person.badges_count || 0) + badgesToAward.length;

    // Atomic update
    const personUpdates = {
      current_streak: currentStreak,
      best_streak: bestStreak,
      chores_completed_count: newChoresCount,
      points_balance: newPointsBalance,
      total_points_earned: newTotalPoints,
      level: levelInfo.level,
      level_title: levelInfo.title,
      badges_count: newBadgesCount,
      last_chore_completed_at: now.toISOString()
    };

    await base44.asServiceRole.entities.Person.update(person.id, personUpdates);

    return Response.json({ 
      success: true, 
      new_badges: badgesToAward.map(b => b.type),
      level_changed: levelChanged,
      new_level: levelInfo.level
    });
  } catch (error) {
    console.error('Error in approveChore:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});