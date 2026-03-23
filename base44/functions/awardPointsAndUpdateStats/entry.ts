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

      const person = await base44.asServiceRole.entities.Person.get(personId);
      const family = await base44.asServiceRole.entities.Family.get(familyId);
      const chore = await base44.asServiceRole.entities.Chore.get(data.chore_id);

      if (!person || !family) {
        return Response.json({ error: 'Person or Family not found' }, { status: 404 });
      }

      // 5A. Streak update
      const tz = family.timezone || 'America/New_York';
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      
      const getTzDateStr = (dateObj) => {
        const parts = formatter.formatToParts(dateObj);
        const getPart = (type) => parts.find(p => p.type === type)?.value;
        return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      };

      const now = new Date();
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
        // if diffDays === 0, streak doesn't change
      } else {
        currentStreak = 1;
      }

      const bestStreak = Math.max(person.best_streak || 0, currentStreak);
      const newChoresCount = (person.chores_completed_count || 0) + 1;
      const newPointsBalance = (person.points_balance || 0) + pointsToAward;
      const newTotalPoints = (person.total_points_earned || 0) + pointsToAward;

      // 5B. Level update
      const levelInfo = getLevelForPoints(newTotalPoints);
      const oldLevel = person.level || 1;
      const levelChanged = levelInfo.level > oldLevel;

      // 5C. Badge checks
      const existingBadges = await base44.asServiceRole.entities.Badge.filter({ person_id: personId });
      const existingBadgeTypes = new Set(existingBadges.map(b => b.badge_type));
      
      const badgesToAward = [];
      const checkAndAward = (type, title, icon, condition, metadata = {}) => {
        if (condition && !existingBadgeTypes.has(type)) {
          badgesToAward.push({ type, title, icon, metadata });
        }
      };

      checkAndAward('first_chore', 'First Steps', '🌱', newChoresCount === 1);
      checkAndAward('streak_3', '3-Day Streak', '🔥', currentStreak >= 3);
      checkAndAward('streak_7', '7-Day Streak', '🔥', currentStreak >= 7);
      checkAndAward('streak_14', '14-Day Streak', '🔥', currentStreak >= 14);
      checkAndAward('streak_30', '30-Day Streak', '🔥', currentStreak >= 30);
      checkAndAward('chores_10', '10 Chores', '✅', newChoresCount >= 10);
      checkAndAward('chores_25', '25 Chores', '✅', newChoresCount >= 25);
      checkAndAward('chores_50', '50 Chores', '✅', newChoresCount >= 50);
      checkAndAward('chores_100', '100 Chores', '✅', newChoresCount >= 100);
      checkAndAward('points_100', '100 Points', '💰', newTotalPoints >= 100);
      checkAndAward('points_500', '500 Points', '💰', newTotalPoints >= 500);
      checkAndAward('points_1000', '1000 Points', '💰', newTotalPoints >= 1000);
      checkAndAward('level_up', 'Level Up', '⬆️', levelChanged, { newLevel: levelInfo.level });

      // Check category master (10+ in a category)
      if (chore && chore.category && !existingBadgeTypes.has('category_master')) {
        const categoryCompletions = await base44.asServiceRole.entities.ChoreCompletion.filter({
          person_id: personId,
          completion_status: 'approved'
        });
        
        const categoryChores = await base44.asServiceRole.entities.Chore.filter({
          family_id: familyId,
          category: chore.category
        });
        const categoryChoreIds = new Set(categoryChores.map(c => c.id));
        
        let categoryCount = 0;
        for (const comp of categoryCompletions) {
          if (categoryChoreIds.has(comp.chore_id)) {
            categoryCount++;
          }
        }
        
        checkAndAward('category_master', `${chore.category} Master`, '👑', categoryCount >= 10, { category: chore.category });
      }

      // Create the badges
      for (const b of badgesToAward) {
        await base44.asServiceRole.entities.Badge.create({
          person_id: personId,
          family_id: familyId,
          badge_type: b.type,
          badge_title: b.title,
          badge_icon: b.icon,
          earned_at: now.toISOString(),
          metadata: JSON.stringify(b.metadata)
        });
      }

      const newBadgesCount = (person.badges_count || 0) + badgesToAward.length;

      // 5D. Atomic update
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

      await base44.asServiceRole.entities.Person.update(personId, personUpdates);

      // Create Reward
      if (pointsToAward > 0) {
        await base44.asServiceRole.entities.Reward.create({
          person_id: personId,
          chore_id: data.chore_id,
          points: pointsToAward,
          reward_type: 'points',
          description: 'Points earned for completing chore',
          week_start: now.toISOString().split('T')[0],
          family_id: familyId
        });
      }

      // Update Assignment
      if (data.assignment_id) {
        await base44.asServiceRole.entities.Assignment.update(data.assignment_id, {
          completed: true,
          completed_date: now.toISOString(),
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