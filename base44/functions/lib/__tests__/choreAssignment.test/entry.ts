import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNextRotationPerson,
  calculateFairnessScore,
  advancedFairAssignment,
} from '../choreAssignment';

// Fix time to a Monday so week calculations are deterministic
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-06-16T12:00:00Z')); // Monday
});
afterEach(() => {
  vi.useRealTimers();
});

// =============================================
// getNextRotationPerson
// =============================================

describe('getNextRotationPerson', () => {
  it('returns null when rotation is not enabled', () => {
    expect(getNextRotationPerson({ manual_rotation_enabled: false }, '2025-06-16')).toBeNull();
  });

  it('returns null when rotation_person_order is empty', () => {
    const chore = { manual_rotation_enabled: true, rotation_person_order: [] };
    expect(getNextRotationPerson(chore, '2025-06-16')).toBeNull();
  });

  it('returns null when rotation_person_order is undefined', () => {
    const chore = { manual_rotation_enabled: true };
    expect(getNextRotationPerson(chore, '2025-06-16')).toBeNull();
  });

  it('returns the first person when there is no prior assignment', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2', 'p3'],
      rotation_current_index: 0,
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p1',
      newIndex: 0,
    });
  });

  it('advances weekly rotation after 1+ weeks', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2', 'p3'],
      rotation_current_index: 0,
      rotation_frequency: 'weekly',
      rotation_last_assigned_date: '2025-06-09', // 1 week ago
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p2',
      newIndex: 1,
    });
  });

  it('advances bi-weekly rotation after 2+ weeks', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2', 'p3'],
      rotation_current_index: 1,
      rotation_frequency: 'bi_weekly',
      rotation_last_assigned_date: '2025-06-02', // 2 weeks ago
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p3',
      newIndex: 2,
    });
  });

  it('does NOT advance bi-weekly rotation after only 1 week', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2', 'p3'],
      rotation_current_index: 1,
      rotation_frequency: 'bi_weekly',
      rotation_last_assigned_date: '2025-06-09', // only 1 week ago
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p2',
      newIndex: 1,
    });
  });

  it('advances monthly rotation after 4+ weeks', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2'],
      rotation_current_index: 0,
      rotation_frequency: 'monthly',
      rotation_last_assigned_date: '2025-05-19', // 4 weeks ago
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p2',
      newIndex: 1,
    });
  });

  it('wraps around to index 0 after the last person', () => {
    const chore = {
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2', 'p3'],
      rotation_current_index: 2, // last person
      rotation_frequency: 'weekly',
      rotation_last_assigned_date: '2025-06-09',
    };
    expect(getNextRotationPerson(chore, '2025-06-16')).toEqual({
      personId: 'p1',
      newIndex: 0,
    });
  });
});

// =============================================
// calculateFairnessScore
// =============================================

describe('calculateFairnessScore', () => {
  it('returns base score with skill match bonus for neutral inputs', () => {
    const person = { id: 'p1' };
    const chore = {};
    const workload = {};
    const history = { p1: 0 };
    // Base 100, workload 0/7=0 penalty, no category bonuses,
    // default skill=2 >= default difficulty=2 => +20
    // history ratio = 0/0 (fallback 1) => 0/1=0 => (0-1)*25 = -25? No...
    // Actually: recentChoreCount=0, values=[0], sum=0, length=1, avg=0/1=0.
    // avgRecentChores = 0 || 1 = 1 (the || 1 fallback). historyRatio = 0/1 = 0.
    // score -= (0-1)*25 = score += 25. So 100 + 20 + 25 = 145
    const score = calculateFairnessScore(person, chore, workload, history);
    expect(score).toBe(145);
  });

  it('applies workload penalty proportional to current/max ratio', () => {
    const person = { id: 'p1', max_weekly_chores: 10 };
    const chore = {};
    const workload = { p1: 5 }; // 5/10 = 0.5 ratio => 0.5*30 = 15 penalty
    const history = { p1: 0 };
    const score = calculateFairnessScore(person, chore, workload, history);
    // 100 - 15 + 20 + 25 = 130
    expect(score).toBe(130);
  });

  it('adds +25 bonus for preferred category', () => {
    const person = { id: 'p1', preferred_categories: ['kitchen'] };
    const chore = { category: 'kitchen' };
    const score = calculateFairnessScore(person, chore, {}, { p1: 0 });
    // 100 + 25 + 20 + 25 = 170
    expect(score).toBe(170);
  });

  it('applies -40 penalty for avoided category', () => {
    const person = { id: 'p1', avoided_categories: ['bathroom'] };
    const chore = { category: 'bathroom' };
    const score = calculateFairnessScore(person, chore, {}, { p1: 0 });
    // 100 - 40 + 20 + 25 = 105
    expect(score).toBe(105);
  });

  it('adds +20 bonus for matching skill level', () => {
    const person = { id: 'p1', skill_level: 'expert' };
    const chore = { difficulty: 'easy' };
    const score = calculateFairnessScore(person, chore, {}, { p1: 0 });
    // 100 + 20 (skill match) + 25 (history) = 145
    expect(score).toBe(145);
  });

  it('applies skill mismatch penalty', () => {
    const person = { id: 'p1', skill_level: 'beginner' };
    const chore = { difficulty: 'hard' };
    // personSkill=1, choreDifficulty=3, diff=2, penalty=20
    const score = calculateFairnessScore(person, chore, {}, { p1: 0 });
    // 100 - 20 (skill) + 25 (history) = 105
    expect(score).toBe(105);
  });

  it('applies history balancing penalty when above average', () => {
    const person = { id: 'p1' };
    const chore = {};
    const history = { p1: 6, p2: 2 };
    // avg = (6+2)/2 = 4, ratio = 6/4 = 1.5, penalty = (1.5-1)*25 = 12.5
    const score = calculateFairnessScore(person, chore, {}, history);
    // 100 + 20 (skill) - 12.5 (history) = 107.5
    expect(score).toBe(107.5);
  });

  it('gives history bonus when below average', () => {
    const person = { id: 'p1' };
    const chore = {};
    const history = { p1: 2, p2: 6 };
    // avg = 4, ratio = 2/4 = 0.5, penalty = (0.5-1)*25 = -12.5 (bonus!)
    const score = calculateFairnessScore(person, chore, {}, history);
    // 100 + 20 (skill) + 12.5 (history bonus) = 132.5
    expect(score).toBe(132.5);
  });
});

// =============================================
// advancedFairAssignment
// =============================================

describe('advancedFairAssignment', () => {
  it('returns empty when people is empty', () => {
    const result = advancedFairAssignment([{ id: 'c1' }], []);
    expect(result).toEqual({ assignments: [], choreUpdates: [] });
  });

  it('returns empty when chores is empty', () => {
    const result = advancedFairAssignment([], [{ id: 'p1' }]);
    expect(result).toEqual({ assignments: [], choreUpdates: [] });
  });

  it('returns empty when people is null', () => {
    const result = advancedFairAssignment([{ id: 'c1' }], null);
    expect(result).toEqual({ assignments: [], choreUpdates: [] });
  });

  it('assigns a single auto-assign chore to the only person', () => {
    const chores = [{ id: 'c1', family_id: 'fam1' }];
    const people = [{ id: 'p1' }];
    const { assignments } = advancedFairAssignment(chores, people);

    expect(assignments).toHaveLength(1);
    expect(assignments[0].person_id).toBe('p1');
    expect(assignments[0].chore_id).toBe('c1');
    expect(assignments[0].completed).toBe(false);
    expect(assignments[0].family_id).toBe('fam1');
  });

  it('skips chores already assigned this week', () => {
    const currentWeekStart = '2025-06-15'; // Sunday (startOfWeek defaults to Sunday)
    const chores = [{ id: 'c1', family_id: 'fam1' }, { id: 'c2', family_id: 'fam1' }];
    const people = [{ id: 'p1' }];
    const existingAssignments = [
      { chore_id: 'c1', person_id: 'p1', week_start: currentWeekStart },
    ];

    const { assignments } = advancedFairAssignment(chores, people, existingAssignments);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].chore_id).toBe('c2');
  });

  it('handles rotation chores correctly', () => {
    const chores = [{
      id: 'c1',
      family_id: 'fam1',
      manual_rotation_enabled: true,
      rotation_person_order: ['p1', 'p2'],
      rotation_current_index: 0,
      rotation_frequency: 'weekly',
      rotation_last_assigned_date: '2025-06-08', // 1 week before Sunday 2025-06-15
    }];
    const people = [{ id: 'p1' }, { id: 'p2' }];

    const { assignments, choreUpdates } = advancedFairAssignment(chores, people);

    expect(assignments).toHaveLength(1);
    expect(assignments[0].person_id).toBe('p2'); // Rotated from p1 to p2
    expect(choreUpdates).toHaveLength(1);
    expect(choreUpdates[0].rotation_current_index).toBe(1);
  });

  it('respects max_weekly_chores limit', () => {
    const currentWeekStart = '2025-06-15'; // Sunday
    const chores = [{ id: 'c1', family_id: 'fam1' }];
    const people = [
      { id: 'p1', max_weekly_chores: 1 },
      { id: 'p2', max_weekly_chores: 5 },
    ];
    const existingAssignments = [
      { chore_id: 'existing', person_id: 'p1', week_start: currentWeekStart },
    ];

    const { assignments } = advancedFairAssignment(chores, people, existingAssignments);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].person_id).toBe('p2'); // p1 is at max
  });

  it('falls back to lowest-workload person when all at capacity', () => {
    const currentWeekStart = '2025-06-15'; // Sunday
    const chores = [{ id: 'c1', family_id: 'fam1' }];
    const people = [
      { id: 'p1', max_weekly_chores: 1 },
      { id: 'p2', max_weekly_chores: 1 },
    ];
    const existingAssignments = [
      { chore_id: 'e1', person_id: 'p1', week_start: currentWeekStart },
      { chore_id: 'e2', person_id: 'p2', week_start: currentWeekStart },
      { chore_id: 'e3', person_id: 'p2', week_start: currentWeekStart },
    ];

    const { assignments } = advancedFairAssignment(chores, people, existingAssignments);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].person_id).toBe('p1'); // p1 has workload 1, p2 has 2
  });

  it('distributes multiple chores fairly across people', () => {
    const chores = [
      { id: 'c1', family_id: 'fam1' },
      { id: 'c2', family_id: 'fam1' },
      { id: 'c3', family_id: 'fam1' },
      { id: 'c4', family_id: 'fam1' },
    ];
    const people = [{ id: 'p1' }, { id: 'p2' }];

    const { assignments } = advancedFairAssignment(chores, people);

    expect(assignments).toHaveLength(4);
    const p1Count = assignments.filter(a => a.person_id === 'p1').length;
    const p2Count = assignments.filter(a => a.person_id === 'p2').length;
    // Should be roughly balanced (2-2)
    expect(p1Count).toBe(2);
    expect(p2Count).toBe(2);
  });
});
