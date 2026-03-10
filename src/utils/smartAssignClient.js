/**
 * Client-side smart chore assignment algorithm.
 * Ported from functions/lib/choreAssignment.ts to run without backend functions.
 *
 * Uses the same fairness scoring system:
 *   - Workload balancing (30 points)
 *   - Category preferences (25 points)
 *   - Skill level matching (20 points)
 *   - Recent completion history (25 points)
 */

import { format, startOfWeek, addDays, addWeeks, parseISO, differenceInWeeks } from 'date-fns';
import { base44 } from '@/api/base44Client';

// ─── Rotation Logic ───────────────────────────────────────────────────────────

function getNextRotationPerson(chore, currentWeekStart) {
  if (
    !chore.manual_rotation_enabled ||
    !chore.rotation_person_order ||
    chore.rotation_person_order.length === 0
  ) {
    return null;
  }

  let currentIndex = chore.rotation_current_index || 0;
  const rotationOrder = chore.rotation_person_order;

  if (chore.rotation_last_assigned_date) {
    const lastAssignedDate = parseISO(chore.rotation_last_assigned_date);
    const currentDate = parseISO(currentWeekStart);
    const weeksDiff = differenceInWeeks(currentDate, lastAssignedDate);

    let shouldAdvance = false;
    if (chore.rotation_frequency === 'weekly' && weeksDiff >= 1) shouldAdvance = true;
    else if (chore.rotation_frequency === 'bi_weekly' && weeksDiff >= 2) shouldAdvance = true;
    else if (chore.rotation_frequency === 'monthly' && weeksDiff >= 4) shouldAdvance = true;

    if (shouldAdvance) {
      currentIndex = (currentIndex + 1) % rotationOrder.length;
    }
  }

  return { personId: rotationOrder[currentIndex], newIndex: currentIndex };
}

// ─── Fairness Score ───────────────────────────────────────────────────────────

function calculateFairnessScore(person, chore, weeklyWorkload, recentHistory) {
  let score = 100;

  // 1. Workload balance (30 points)
  const currentWorkload = weeklyWorkload[person.id] || 0;
  const maxChores = person.max_weekly_chores || 7;
  const workloadRatio = currentWorkload / maxChores;
  score -= workloadRatio * 30;

  // 2. Category preferences (25 points)
  if (person.preferred_categories && person.preferred_categories.includes(chore.category)) {
    score += 25;
  }
  if (person.avoided_categories && person.avoided_categories.includes(chore.category)) {
    score -= 40;
  }

  // 3. Skill level match (20 points)
  const skillLevels = { beginner: 1, intermediate: 2, expert: 3 };
  const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
  const personSkill = skillLevels[person.skill_level] || 2;
  const choreDifficulty = difficultyLevels[chore.difficulty] || 2;

  if (personSkill >= choreDifficulty) {
    score += 20;
  } else {
    score -= (choreDifficulty - personSkill) * 10;
  }

  // 4. Recent history (25 points)
  const recentChoreCount = recentHistory[person.id] || 0;
  const historyValues = Object.values(recentHistory);
  const avgRecentChores =
    historyValues.length > 0
      ? historyValues.reduce((a, b) => a + b, 0) / historyValues.length
      : 1;
  const historyRatio = recentChoreCount / (avgRecentChores || 1);
  score -= (historyRatio - 1) * 25;

  return score;
}

// ─── Advanced Fair Assignment ─────────────────────────────────────────────────

function advancedFairAssignment(chores, people, existingAssignments = [], recentRewards = []) {
  if (!people || people.length === 0 || !chores || chores.length === 0) {
    return { assignments: [], choreUpdates: [] };
  }

  const currentWeekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');

  const rotationChores = chores.filter((c) => c.manual_rotation_enabled);
  const autoAssignChores = chores.filter(
    (c) => c.auto_assign !== false && !c.manual_rotation_enabled
  );

  const assignedChoreIds = new Set(
    existingAssignments
      .filter((a) => a.week_start === currentWeekStart)
      .map((a) => a.chore_id)
  );

  const unassignedRotationChores = rotationChores.filter((c) => !assignedChoreIds.has(c.id));
  const unassignedAutoChores = autoAssignChores.filter((c) => !assignedChoreIds.has(c.id));

  // Current workload
  const weeklyWorkload = {};
  const weeklyTimeLoad = {};
  people.forEach((p) => {
    weeklyWorkload[p.id] = 0;
    weeklyTimeLoad[p.id] = 0;
  });

  existingAssignments
    .filter((a) => a.week_start === currentWeekStart)
    .forEach((a) => {
      weeklyWorkload[a.person_id] = (weeklyWorkload[a.person_id] || 0) + 1;
      const chore = chores.find((c) => c.id === a.chore_id);
      if (chore && chore.estimated_time) {
        weeklyTimeLoad[a.person_id] = (weeklyTimeLoad[a.person_id] || 0) + chore.estimated_time;
      }
    });

  // Recent history (last 4 weeks)
  const recentHistory = {};
  people.forEach((p) => (recentHistory[p.id] = 0));

  const fourWeeksAgo = format(addWeeks(startOfWeek(new Date()), -4), 'yyyy-MM-dd');
  recentRewards
    .filter((r) => r.reward_type === 'points' && r.week_start >= fourWeeksAgo)
    .forEach((r) => {
      recentHistory[r.person_id] = (recentHistory[r.person_id] || 0) + 1;
    });

  const newAssignments = [];
  const choreUpdatesToReturn = [];

  // 1. Handle rotation chores
  for (const chore of unassignedRotationChores) {
    const rotationResult = getNextRotationPerson(chore, currentWeekStart);
    if (rotationResult && rotationResult.personId) {
      const person = people.find((p) => p.id === rotationResult.personId);
      if (person) {
        newAssignments.push({
          person_id: rotationResult.personId,
          chore_id: chore.id,
          week_start: currentWeekStart,
          due_date: format(addDays(startOfWeek(new Date()), 6), 'yyyy-MM-dd'),
          completed: false,
          family_id: chore.family_id,
        });
        choreUpdatesToReturn.push({
          id: chore.id,
          rotation_current_index: rotationResult.newIndex,
          rotation_last_assigned_date: currentWeekStart,
        });
        weeklyWorkload[rotationResult.personId]++;
        weeklyTimeLoad[rotationResult.personId] += chore.estimated_time || 0;
      }
    }
  }

  // 2. Sort auto-assign chores by priority and difficulty
  unassignedAutoChores.sort((a, b) => {
    const priorityDiff = (b.priority_weight || 5) - (a.priority_weight || 5);
    if (priorityDiff !== 0) return priorityDiff;
    const difficultyMap = { hard: 3, medium: 2, easy: 1 };
    return (difficultyMap[b.difficulty] || 2) - (difficultyMap[a.difficulty] || 2);
  });

  // 3. Assign using fairness scoring
  for (const chore of unassignedAutoChores) {
    let bestPerson = null;
    let bestScore = -Infinity;

    let eligiblePeople = people.filter((p) => {
      const workload = weeklyWorkload[p.id] || 0;
      const maxChores = p.max_weekly_chores || 7;
      return workload < maxChores;
    });

    if (eligiblePeople.length === 0) {
      eligiblePeople = [...people]
        .sort((a, b) => (weeklyWorkload[a.id] || 0) - (weeklyWorkload[b.id] || 0))
        .slice(0, 1);
    }

    for (const person of eligiblePeople) {
      const score = calculateFairnessScore(person, chore, weeklyWorkload, recentHistory);
      if (score > bestScore) {
        bestScore = score;
        bestPerson = person;
      }
    }

    if (bestPerson) {
      newAssignments.push({
        person_id: bestPerson.id,
        chore_id: chore.id,
        week_start: currentWeekStart,
        due_date: format(addDays(startOfWeek(new Date()), 6), 'yyyy-MM-dd'),
        completed: false,
        family_id: chore.family_id,
      });
      weeklyWorkload[bestPerson.id]++;
      weeklyTimeLoad[bestPerson.id] += chore.estimated_time || 0;
    }
  }

  return { assignments: newAssignments, choreUpdates: choreUpdatesToReturn };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Client-side smart chore assignment.
 * Replaces the smartAssignChores serverless function.
 *
 * @param {{ preview?: boolean }} opts
 * @returns {{ data: { assignments: Array, choreUpdates: Array, preview?: boolean } }}
 */
export async function smartAssignChores({ preview = false } = {}) {
  // Fetch the data we need from Base44
  const [people, chores, assignments, rewards] = await Promise.all([
    base44.entities.Person.list().catch(() => []),
    base44.entities.Chore.list().catch(() => []),
    base44.entities.Assignment.list().catch(() => []),
    base44.entities.Reward.list().catch(() => []),
  ]);

  // Filter to active people only
  const activePeople = people.filter((p) => p.is_active !== false);

  // Run the assignment algorithm
  const result = advancedFairAssignment(chores, activePeople, assignments, rewards);

  if (preview) {
    return {
      data: {
        success: true,
        preview: true,
        assignments: result.assignments,
        choreUpdates: result.choreUpdates,
        message: `Preview: ${result.assignments.length} chore(s) would be assigned`,
      },
    };
  }

  // Actually create the assignments and update chores
  const createdAssignments = [];

  for (const assignment of result.assignments) {
    try {
      const created = await base44.entities.Assignment.create({
        ...assignment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      createdAssignments.push(created);
    } catch (err) {
      console.error('[smartAssignClient] Failed to create assignment:', err);
    }
  }

  for (const update of result.choreUpdates) {
    try {
      await base44.entities.Chore.update(update.id, {
        rotation_current_index: update.rotation_current_index,
        rotation_last_assigned_date: update.rotation_last_assigned_date,
      });
    } catch (err) {
      console.error('[smartAssignClient] Failed to update chore rotation:', err);
    }
  }

  return {
    data: {
      success: true,
      assignments: createdAssignments,
      choreUpdates: result.choreUpdates,
      message: `${createdAssignments.length} chore(s) assigned successfully`,
    },
  };
}
