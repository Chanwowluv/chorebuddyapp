import React, { useState, useEffect, useMemo } from "react";
import { useData } from '../components/contexts/DataContext';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Target, Trophy } from "lucide-react";
import { parseISO, isAfter } from "date-fns";
import { toast } from "sonner";
import { stripHTMLTags } from '@/components/lib/sanitization';
import LoadingSpinner from "../components/ui/LoadingSpinner";
import FamilyGoalCard from "../components/goals/FamilyGoalCard";
import GoalFormModal from "../components/goals/GoalFormModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useSubscriptionAccess } from '../components/hooks/useSubscriptionAccess';
import FeatureGate from "../components/ui/FeatureGate";
import { isParent as checkParent } from '@/components/lib/roles';

export default function Goals() {
  const { people, rewards, goals, user, loading, addGoal, updateGoal, deleteGoal, refresh } = useData();
  const { canAccess } = useSubscriptionAccess();
  const isParent = checkParent(user);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // Calculate current family points
  const familyPoints = useMemo(() => {
    return rewards.filter((r) => r.points > 0).reduce((sum, r) => sum + r.points, 0);
  }, [rewards]);

  // Sort goals by creation date (newest first)
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  }, [goals]);

  // Update goal progress based on current points (runs for all users).
  // Uses FamilyGoal entity directly since this is an automated sync, not user-initiated CRUD,
  // so it bypasses DataContext's requireParentRole() guard intentionally.
  useEffect(() => {
    const updateGoalProgress = async () => {
      const updates = sortedGoals.filter((goal) =>
      goal.status === 'active' && goal.current_points !== familyPoints
      );

      for (const goal of updates) {
        await base44.entities.FamilyGoal.update(goal.id, { current_points: familyPoints });

        // Check if goal is completed
        if (familyPoints >= goal.target_points) {
          await base44.entities.FamilyGoal.update(goal.id, {
            status: 'completed',
            completed_date: new Date().toISOString()
          });
          toast.success(`Family goal "${goal.title}" completed!`);
        }
      }

      // Check for expired goals
      const now = new Date();
      const expiredGoals = sortedGoals.filter((goal) =>
      goal.status === 'active' && goal.end_date && isAfter(now, parseISO(goal.end_date))
      );

      for (const goal of expiredGoals) {
        await base44.entities.FamilyGoal.update(goal.id, { status: 'expired' });
      }

      // Refresh DataContext to pick up changes
      if (updates.length > 0 || expiredGoals.length > 0) {
        await refresh();
      }
    };

    if (sortedGoals.length > 0 && familyPoints >= 0) {
      const timer = setTimeout(updateGoalProgress, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    }
  }, [sortedGoals, familyPoints, refresh]);

  const handleShowAddForm = () => {
    if (!canAccess('family_goals')) {
      return; // FeatureGate will handle this
    }
    setGoalToEdit(null);
    setFormModalOpen(true);
  };

  const handleShowEditForm = (goal) => {
    setGoalToEdit(goal);
    setFormModalOpen(true);
  };

  const handleSubmit = async (goalData) => {
    if (!isParent) {
      toast.error("Only parents can manage goals");
      return;
    }
    const sanitized = {
      ...goalData,
      title: stripHTMLTags(goalData.title),
      description: stripHTMLTags(goalData.description),
    };
    try {
      if (goalToEdit) {
        await updateGoal(goalToEdit.id, sanitized);
      } else {
        await addGoal({
          ...sanitized,
          current_points: familyPoints
        });
      }
      setFormModalOpen(false);
      setGoalToEdit(null);
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal");
    }
  };

  const handleDelete = (goalId) => {
    setGoalToDelete(goalId);
  };

  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;
    if (!isParent) {
      toast.error("Only parents can delete goals");
      return;
    }
    try {
      await deleteGoal(goalToDelete);
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    } finally {
      setGoalToDelete(null);
    }
  };

  const handleClaimReward = async (goalId) => {
    if (!isParent) {
      toast.error("Only parents can claim rewards");
      return;
    }
    try {
      await updateGoal(goalId, { status: 'completed' });
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward");
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading family goals..." />;
  }

  const activeGoals = sortedGoals.filter((g) => g.status === 'active');
  const completedGoals = sortedGoals.filter((g) => g.status === 'completed');

  return (
    <FeatureGate
      feature="family_goals"
      customMessage="Family Goals help your household work together towards shared rewards. Available on Family Plus plans.">

      <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-8 lg:pb-8">
        <ConfirmDialog
          isOpen={!!goalToDelete}
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Goal"
          message="Are you sure you want to delete this goal? This action cannot be undone."
          confirmText="Delete"
          cancelText="Keep"
        />
        <GoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => setFormModalOpen(false)}
          onSubmit={handleSubmit}
          goalToEdit={goalToEdit}
          currentFamilyPoints={familyPoints} />


        {/* Header */}
        <div className="funky-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-green-400 flex items-center justify-center">
                <Target className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <p className="body-font text-lg md:text-xl text-[#FF6B35]">Family</p>
                <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Shared Goals</h1>
                <p className="body-font-light text-gray-600 mt-2">
                  Work together towards common rewards
                </p>
              </div>
            </div>
            {isParent && (
              <Button
                onClick={handleShowAddForm}
                className="funky-button bg-[#C3B1E1] text-white px-6 py-3 text-lg md:px-8 md:py-4 md:text-xl header-font w-full md:w-auto">
                <Plus className="w-6 h-6 mr-3" />
                Create Goal
              </Button>
            )}
          </div>
        </div>

        {/* Family Points Summary */}
        <div className="funky-card p-6 border-4 border-green-400 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="header-font text-2xl text-[#2B59C3]">Total Family Points</h3>
              <p className="body-font-light text-gray-600">Combined points earned by all family members</p>
            </div>
            <div className="text-right">
              <div className="header-font text-4xl text-green-600">{familyPoints}</div>
              <div className="body-font text-sm text-green-700">points available</div>
            </div>
          </div>
        </div>

        {/* Active Goals */}
        {activeGoals.length > 0 &&
        <div className="space-y-6">
            <h2 className="header-font text-3xl text-[#2B59C3]">Active Goals</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {activeGoals.map((goal) =>
            <FamilyGoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleShowEditForm}
              onDelete={handleDelete}
              onClaim={handleClaimReward}
              currentPoints={familyPoints} />

            )}
            </div>
          </div>
        }

        {/* Completed Goals */}
        {completedGoals.length > 0 &&
        <div className="space-y-6">
            <h2 className="header-font text-3xl text-green-600 flex items-center gap-2">
              <Trophy className="w-8 h-8" />
              Completed Goals
            </h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {completedGoals.map((goal) =>
            <FamilyGoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => {}}
              onDelete={handleDelete}
              onClaim={() => {}}
              currentPoints={familyPoints}
              isCompleted />

            )}
            </div>
          </div>
        }

        {/* Empty State */}
        {sortedGoals.length === 0 &&
        <div className="funky-card p-12 text-center border-4 border-dashed border-green-400">
            <Target className="w-24 h-24 mx-auto mb-6 text-green-400" />
            <h3 className="header-font text-3xl text-[#2B59C3] mb-4">No Family Goals Yet</h3>
            <p className="body-font-light text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Create shared goals that the whole family can work towards together
            </p>
            {isParent && (
              <Button
                onClick={handleShowAddForm}
                className="funky-button bg-green-400 text-white px-8 py-4 header-font text-xl">
                <Plus className="w-6 h-6 mr-3" />
                Create Your First Goal
              </Button>
            )}
          </div>
        }
      </div>
    </FeatureGate>);

}