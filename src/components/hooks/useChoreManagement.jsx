import { useState, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateChorePoints } from '../lib/pointsCalculator';

export const useChoreManagement = () => {
  const { chores, assignments, updateAssignment, addReward, addCompletion } = useData();
  const [completedChoreId, setCompletedChoreId] = useState(null);
  const [pointsEarned, setPointsEarned] = useState({ visible: false, amount: 0, reason: '' });

  const completeChore = useCallback(async (assignmentId, choreId, notes = '', photoUrl = null, difficultyRating = null) => {
    // Get fresh data at the time of execution
    const assignment = assignments.find((a) => a.id === assignmentId);
    const chore = chores.find((c) => c.id === choreId);

    if (!assignment || !chore) return;

    // Calculate points with bonuses
    const points = calculateChorePoints(chore, assignment);
    const needsApproval = chore.requires_approval;

    // 1. Show appropriate notification IMMEDIATELY (Optimistic UI)
    setPointsEarned({
      visible: true,
      amount: needsApproval ? 0 : points,
      reason: needsApproval
        ? `${chore.title} submitted for approval!`
        : `${chore.title} completed!`
    });
    
    // 2. Trigger confetti IMMEDIATELY (Optimistic UI)
    setCompletedChoreId(choreId);
    setTimeout(() => {
      setCompletedChoreId(null);
      setPointsEarned({ visible: false, amount: 0, reason: '' });
    }, 4000);

    // 3. Run API calls in background without awaiting them to block the UI
    (async () => {
      try {
        const completionPromise = addCompletion({
          assignment_id: assignmentId,
          person_id: assignment.person_id,
          chore_id: choreId,
          completion_status: needsApproval ? 'pending_approval' : 'submitted',
          points_awarded: needsApproval ? 0 : points,
          notes: notes || '',
          photo_url: photoUrl || '',
          difficulty_rating: difficultyRating || undefined
        });

        const updatePromise = updateAssignment(assignmentId, {
          completed: true,
          completed_date: new Date().toISOString(),
          approval_status: needsApproval ? 'pending' : undefined,
          points_awarded: needsApproval ? 0 : points,
          notes: notes || undefined,
          photo_url: photoUrl || undefined
        });

        await Promise.all([completionPromise, updatePromise]);

        if (!needsApproval) {
          await addReward({
            person_id: assignment.person_id,
            chore_id: choreId,
            points: points,
            reward_type: "points",
            week_start: assignment.week_start,
            description: `Completed: ${chore.title}`
          });
        }
      } catch (error) {
        console.error("Failed to complete chore:", error);
      }
    })();
  }, [assignments, chores, updateAssignment, addReward, addCompletion]);
  
  return { completeChore, completedChoreIdWithConfetti: completedChoreId, pointsEarned };
};