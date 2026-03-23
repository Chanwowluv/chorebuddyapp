import { format, startOfWeek, addDays, addWeeks, parseISO, differenceInWeeks } from 'npm:date-fns@3.6.0';

// Handle manual rotation for a chore
export const getNextRotationPerson = (chore, currentWeekStart) => {
    if (!chore.manual_rotation_enabled || !chore.rotation_person_order || chore.rotation_person_order.length === 0) {
        return null;
    }

    let currentIndex = chore.rotation_current_index || 0;
    const rotationOrder = chore.rotation_person_order;

    // Check if we need to advance the rotation
    if (chore.rotation_last_assigned_date) {
        const lastAssignedDate = parseISO(chore.rotation_last_assigned_date);
        const currentDate = parseISO(currentWeekStart);
        const weeksDiff = differenceInWeeks(currentDate, lastAssignedDate);

        let shouldAdvance = false;
        if (chore.rotation_frequency === 'weekly' && weeksDiff >= 1) {
            shouldAdvance = true;
        } else if (chore.rotation_frequency === 'bi_weekly' && weeksDiff >= 2) {
            shouldAdvance = true;
        } else if (chore.rotation_frequency === 'monthly' && weeksDiff >= 4) {
            shouldAdvance = true;
        }

        if (shouldAdvance) {
            currentIndex = (currentIndex + 1) % rotationOrder.length;
        }
    }

    return {
        personId: rotationOrder[currentIndex],
        newIndex: currentIndex
    };
};

// Calculate a fairness score for assigning a chore to a person
export const calculateFairnessScore = (person, chore, weeklyWorkload, recentHistory) => {
    let score = 100; // Start with perfect score

    // 1. Workload Balance (30 points) - penalize if person has more chores
    const currentWorkload = weeklyWorkload[person.id] || 0;
    const maxChores = person.max_weekly_chores || 7;
    const workloadRatio = currentWorkload / maxChores;
    score -= workloadRatio * 30;

    // 2. Category Preferences (25 points)
    if (person.preferred_categories && person.preferred_categories.includes(chore.category)) {
        score += 25; // Bonus for preferred category
    }
    if (person.avoided_categories && person.avoided_categories.includes(chore.category)) {
        score -= 40; // Strong penalty for avoided category
    }

    // 3. Skill Level Match (20 points)
    const skillLevels = { beginner: 1, intermediate: 2, expert: 3 };
    const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
    const personSkill = skillLevels[person.skill_level] || 2;
    const choreDifficulty = difficultyLevels[chore.difficulty] || 2;

    if (personSkill >= choreDifficulty) {
        score += 20; // Good match
    } else {
        score -= (choreDifficulty - personSkill) * 10; // Penalty for mismatch
    }

    // 4. Recent Completion History (25 points) - balance who's been doing chores
    const recentChoreCount = recentHistory[person.id] || 0;
    const avgRecentChores = Object.values(recentHistory).reduce((a, b) => a + b, 0) / Object.keys(recentHistory).length || 1;
    const historyRatio = recentChoreCount / avgRecentChores;
    score -= (historyRatio - 1) * 25; // Penalty if person has done more than average recently

    return score;
};

// Advanced assignment algorithm with fairness considerations
export const advancedFairAssignment = (chores, people, existingAssignments = [], recentRewards = []) => {
    if (!people || people.length === 0 || !chores || chores.length === 0) {
        return { assignments: [], choreUpdates: [] };
    }

    const currentWeekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");

    // Separate chores into rotation and auto-assign
    const rotationChores = chores.filter(c => c.manual_rotation_enabled);
    const autoAssignChores = chores.filter(c => c.auto_assign !== false && !c.manual_rotation_enabled);

    // Create a map of chores already assigned this week
    const assignedChoreIds = new Set(
        existingAssignments
            .filter(a => a.week_start === currentWeekStart)
            .map(a => a.chore_id)
    );

    // Filter out already assigned chores
    const unassignedRotationChores = rotationChores.filter(c => !assignedChoreIds.has(c.id));
    const unassignedAutoChores = autoAssignChores.filter(c => !assignedChoreIds.has(c.id));

    // Calculate current workload
    const weeklyWorkload = {};
    const weeklyTimeLoad = {}; // Track time commitment
    people.forEach(p => {
        weeklyWorkload[p.id] = 0;
        weeklyTimeLoad[p.id] = 0;
    });

    existingAssignments
        .filter(a => a.week_start === currentWeekStart)
        .forEach(a => {
            weeklyWorkload[a.person_id] = (weeklyWorkload[a.person_id] || 0) + 1;
            const chore = chores.find(c => c.id === a.chore_id);
            if (chore && chore.estimated_time) {
                weeklyTimeLoad[a.person_id] = (weeklyTimeLoad[a.person_id] || 0) + chore.estimated_time;
            }
        });

    // Calculate recent history (last 4 weeks) from rewards
    const recentHistory = {};
    people.forEach(p => recentHistory[p.id] = 0);

    const fourWeeksAgo = format(addWeeks(startOfWeek(new Date()), -4), "yyyy-MM-dd");
    recentRewards
        .filter(r => r.reward_type === 'points' && r.week_start >= fourWeeksAgo)
        .forEach(r => {
            recentHistory[r.person_id] = (recentHistory[r.person_id] || 0) + 1;
        });

    const newAssignments = [];
    const choreUpdatesToReturn = [];

    // First, handle rotation chores
    for (const chore of unassignedRotationChores) {
        const rotationResult = getNextRotationPerson(chore, currentWeekStart);

        if (rotationResult && rotationResult.personId) {
            const person = people.find(p => p.id === rotationResult.personId);
            if (person) {
                newAssignments.push({
                    person_id: rotationResult.personId,
                    chore_id: chore.id,
                    week_start: currentWeekStart,
                    due_date: format(addDays(startOfWeek(new Date()), 6), "yyyy-MM-dd"),
                    completed: false,
                    family_id: chore.family_id,
                });

                choreUpdatesToReturn.push({
                    id: chore.id,
                    rotation_current_index: rotationResult.newIndex,
                    rotation_last_assigned_date: currentWeekStart
                });

                weeklyWorkload[rotationResult.personId]++;
                weeklyTimeLoad[rotationResult.personId] += chore.estimated_time || 0;
            }
        }
    }

    // Sort auto-assign chores by priority and difficulty
    unassignedAutoChores.sort((a, b) => {
        const priorityDiff = (b.priority_weight || 5) - (a.priority_weight || 5);
        if (priorityDiff !== 0) return priorityDiff;

        // Secondary sort by difficulty (hard first)
        const difficultyMap = { hard: 3, medium: 2, easy: 1 };
        return (difficultyMap[b.difficulty] || 2) - (difficultyMap[a.difficulty] || 2);
    });

    // Assign chores using fairness scoring
    for (const chore of unassignedAutoChores) {
        let bestPerson = null;
        let bestScore = -Infinity;

        // Find all people under their max chore limit
        let eligiblePeople = people.filter(p => {
            const workload = weeklyWorkload[p.id] || 0;
            const maxChores = p.max_weekly_chores || 7;
            return workload < maxChores;
        });

        if (eligiblePeople.length === 0) {
            // If everyone is at capacity, assign to person with lowest current workload
            eligiblePeople = [...people].sort((a, b) => {
                const workloadA = weeklyWorkload[a.id] || 0;
                const workloadB = weeklyWorkload[b.id] || 0;
                return workloadA - workloadB;
            }).slice(0, 1);
        }

        // Calculate fairness score for each eligible person
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
                due_date: format(addDays(startOfWeek(new Date()), 6), "yyyy-MM-dd"),
                completed: false,
                family_id: chore.family_id,
            });

            weeklyWorkload[bestPerson.id]++;
            weeklyTimeLoad[bestPerson.id] += chore.estimated_time || 0;
        }
    }

    return { assignments: newAssignments, choreUpdates: choreUpdatesToReturn };
};
