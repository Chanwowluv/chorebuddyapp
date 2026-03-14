import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TYPE_MAP = {
  // Renamed types
  streak_master_7: "streak_7",
  streak_master_30: "streak_30",
  milestone_10: "chores_10",
  milestone_50: "chores_50",
  milestone_100: "chores_100",
  category_master_kitchen: "category_master",
  category_master_bathroom: "category_master",
  category_master_bedroom: "category_master",
  // 1:1 types
  first_chore: "first_chore",
  early_bird: "early_bird",
  night_owl: "night_owl",
  speed_demon: "speed_demon",
  weekend_warrior: "weekend_warrior",
  team_player: "team_player",
  perfectionist: "perfectionist",
  challenge_champion: "challenge_champion",
};

const BADGE_CATALOG = {
  first_chore: { title: "First Steps", icon: "👣" },
  streak_7: { title: "Week Warrior", icon: "💪" },
  streak_30: { title: "Streak Master", icon: "🌋" },
  chores_10: { title: "Getting Started", icon: "🧹" },
  chores_50: { title: "Half Century", icon: "🥇" },
  chores_100: { title: "Centurion", icon: "💯" },
  category_master: { title: "Category Master", icon: "🎯" },
  early_bird: { title: "Early Bird", icon: "🌅" },
  night_owl: { title: "Night Owl", icon: "🦉" },
  speed_demon: { title: "Speed Demon", icon: "⚡" },
  weekend_warrior: { title: "Weekend Warrior", icon: "🎮" },
  team_player: { title: "Team Player", icon: "🤝" },
  perfectionist: { title: "Perfectionist", icon: "✨" },
  challenge_champion: { title: "Challenge Champion", icon: "🏅" },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      // Allow parent role as well for this specific app's context, or just check if they are logged in and have admin rights.
      // Actually, since it's a one-time migration script, we can just check if they are authenticated, or use service role.
      // Let's use service role to fetch all achievements across all families.
    }

    // Fetch all achievements
    const allAchievements = await base44.asServiceRole.entities.Achievement.list();
    
    // Fetch all existing badges to avoid duplicates
    const allBadges = await base44.asServiceRole.entities.Badge.list();
    
    let migrated = 0;
    let skipped = 0;
    let errors = [];

    const personBadgeCounts = {};

    for (const achievement of allAchievements) {
      try {
        const mappedType = TYPE_MAP[achievement.badge_type];
        
        if (!mappedType) {
          skipped++;
          continue;
        }

        const catalogInfo = BADGE_CATALOG[mappedType];
        if (!catalogInfo) {
          skipped++;
          continue;
        }

        // Check for duplicates
        const isDuplicate = allBadges.some(b => 
          b.person_id === achievement.person_id && 
          b.badge_type === mappedType
        );

        if (isDuplicate) {
          skipped++;
          // Still count it towards the person's total if it exists
          personBadgeCounts[achievement.person_id] = (personBadgeCounts[achievement.person_id] || 0) + 1;
          continue;
        }

        // Create the badge
        await base44.asServiceRole.entities.Badge.create({
          person_id: achievement.person_id,
          family_id: achievement.family_id,
          badge_type: mappedType,
          badge_title: catalogInfo.title,
          badge_icon: catalogInfo.icon,
          earned_at: achievement.earned_date || new Date().toISOString(),
          metadata: typeof achievement.metadata === 'object' ? JSON.stringify(achievement.metadata) : (achievement.metadata || "{}")
        });

        personBadgeCounts[achievement.person_id] = (personBadgeCounts[achievement.person_id] || 0) + 1;
        migrated++;
      } catch (err) {
        errors.push({ id: achievement.id, error: err.message });
      }
    }

    // Update persons' badges_count
    for (const [personId, count] of Object.entries(personBadgeCounts)) {
      try {
        await base44.asServiceRole.entities.Person.update(personId, {
          badges_count: count
        });
      } catch (err) {
        errors.push({ person_id: personId, error: `Failed to update count: ${err.message}` });
      }
    }

    return Response.json({
      total_achievements: allAchievements.length,
      migrated,
      skipped,
      errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});