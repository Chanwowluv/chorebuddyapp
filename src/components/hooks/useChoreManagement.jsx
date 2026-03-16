import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
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
        const res = await base44.functions.invoke('submitChore', {
          assignmentId,
          choreId,
          notes: notes || '',
          photoUrl: photoUrl || '',
          difficultyRating: difficultyRating || undefined
        });
        
        if (res.error) {
          throw new Error(res.error);
        }
      } catch (error) {
        console.error("Failed to complete chore:", error);
        // If it fails, revert the optimistic UI (optional, but good practice)
      }
    })();
  }, [assignments, chores, updateAssignment, addReward, addCompletion]);
  
  return { completeChore, completedChoreIdWithConfetti: completedChoreId, pointsEarned };
};