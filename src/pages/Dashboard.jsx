import React, { useState, useMemo, useCallback, useReducer } from "react";
import { smartAssignChores } from "@/utils/smartAssignClient";
import { format, startOfWeek } from "date-fns";
import { useData } from "../components/contexts/DataContext";
import { toast } from "sonner";

import { useSubscriptionAccess } from "../components/hooks/useSubscriptionAccess";
import { useChoreManagement } from "../components/hooks/useChoreManagement";
import UpgradeModal from "../components/ui/UpgradeModal";
import AssignmentPreview from "../components/admin/AssignmentPreview";
import ReassignModal from "../components/chores/ReassignModal";

import Confetti from "../components/ui/Confetti";
import ParentDashboard from "../components/dashboard/ParentDashboard";
import DashboardStats from "../components/dashboard/DashboardStats";
import ChoresSection from "../components/dashboard/ChoresSection";
import LevelProgressCard from "../components/dashboard/LevelProgressCard";
import StreakDisplay from "../components/dashboard/StreakDisplay";
import BadgeCollection from "../components/dashboard/BadgeCollection";
import PointsEarnedNotification from "../components/gamification/PointsEarnedNotification";
import { isParent as checkParent, isChild as checkChild } from "@/components/lib/roles";
import ErrorBoundaryWithRetry from "../components/ui/ErrorBoundaryWithRetry";
import PullToRefresh from "../components/ui/PullToRefresh";

// ─── Shared layout wrapper (eliminates duplication) ──────────────────────────

function DashboardShell({ onRefresh, pointsEarned, showConfetti, children }) {
  return (
    <ErrorBoundaryWithRetry level="page">
      <PullToRefresh onRefresh={onRefresh}>
        <div className="min-h-screen relative">
          <PointsEarnedNotification
            points={pointsEarned.amount}
            reason={pointsEarned.reason}
            isVisible={pointsEarned.visible}
          />
          {showConfetti && <Confetti />}
          {children}
        </div>
      </PullToRefresh>
    </ErrorBoundaryWithRetry>
  );
}

// ─── Modal state reducer (prevents impossible states) ────────────────────────

const MODAL_ACTIONS = {
  OPEN_UPGRADE: "OPEN_UPGRADE",
  OPEN_PREVIEW: "OPEN_PREVIEW",
  OPEN_REASSIGN: "OPEN_REASSIGN",
  CLOSE_ALL: "CLOSE_ALL",
  CLOSE_REASSIGN: "CLOSE_REASSIGN",
  CLOSE_PREVIEW: "CLOSE_PREVIEW",
  UPDATE_PREVIEW: "UPDATE_PREVIEW",
};

const initialModalState = {
  upgradeOpen: false,
  previewOpen: false,
  previewAssignments: [],
  reassignOpen: false,
  reassignData: null,
};

function modalReducer(state, action) {
  switch (action.type) {
    case MODAL_ACTIONS.OPEN_UPGRADE:
      return { ...initialModalState, upgradeOpen: true };

    case MODAL_ACTIONS.OPEN_PREVIEW:
      return {
        ...state,
        previewOpen: true,
        previewAssignments: action.payload,
      };

    case MODAL_ACTIONS.OPEN_REASSIGN:
      return {
        ...state,
        reassignOpen: true,
        reassignData: action.payload,
      };

    case MODAL_ACTIONS.CLOSE_REASSIGN:
      return { ...state, reassignOpen: false, reassignData: null };

    case MODAL_ACTIONS.CLOSE_PREVIEW:
      return {
        ...state,
        previewOpen: false,
        previewAssignments: [],
      };

    case MODAL_ACTIONS.UPDATE_PREVIEW:
      return {
        ...state,
        previewAssignments: action.payload,
      };

    case MODAL_ACTIONS.CLOSE_ALL:
      return initialModalState;

    default:
      return state;
  }
}

// ─── Loading skeleton (better UX than spinner) ───────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-[400px] p-6 md:p-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="funky-card p-6 md:p-8">
        <div className="h-10 bg-gray-200 rounded-lg w-48 mb-3" />
        <div className="h-5 bg-gray-100 rounded w-64" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="funky-card p-4">
            <div className="h-8 bg-gray-200 rounded w-12 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      {/* Chore cards skeleton */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="funky-card p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Unlinked child account empty state ──────────────────────────────────────

function UnlinkedAccountNotice() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="funky-card p-8 max-w-md">
        <h2 className="header-font text-2xl text-[#2B59C3] mb-3">
          Account Not Linked
        </h2>
        <p className="body-font-light text-gray-600 mb-4">
          Ask your parent to link your account so you can see your chores and
          start earning rewards!
        </p>
      </div>
    </div>
  );
}

// ─── Main Dashboard component ────────────────────────────────────────────────

export default function Dashboard() {
  const {
    assignments,
    chores,
    people,
    user,
    loading,
    fetchData,
    createAssignment,
    updateChore,
  } = useData();
  const { canAccess, getRequiredTier, getTierDisplayName } =
    useSubscriptionAccess();
  const { completeChore, completedChoreIdWithConfetti, pointsEarned } =
    useChoreManagement();

  const [isAssigning, setIsAssigning] = useState(false);
  const [modalState, dispatchModal] = useReducer(
    modalReducer,
    initialModalState
  );

  const isParent = checkParent(user);
  const isChild = checkChild(user);

  // ── Derived data ──────────────────────────────────────────────────────────

  const currentWeekAssignments = useMemo(() => {
    const currentWeek = format(startOfWeek(new Date()), "yyyy-MM-dd");
    let filtered = assignments.filter((a) => a.week_start === currentWeek);

    if (isChild && user?.linked_person_id) {
      filtered = filtered.filter((a) => a.person_id === user.linked_person_id);
    }

    return filtered;
  }, [assignments, isChild, user]);

  const pendingAssignments = useMemo(
    () => currentWeekAssignments.filter((a) => !a.completed),
    [currentWeekAssignments]
  );

  const completedAssignments = useMemo(
    () => currentWeekAssignments.filter((a) => a.completed),
    [currentWeekAssignments]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const assignChoresForWeek = useCallback(async () => {
    if (!canAccess("choreai_smart_assignment")) {
      dispatchModal({ type: MODAL_ACTIONS.OPEN_UPGRADE });
      return;
    }

    setIsAssigning(true);
    try {
      const result = await smartAssignChores({ preview: true });

      if (result.status && result.status >= 400) {
        toast.error(result?.data?.error || "Failed to assign chores.");
        setIsAssigning(false);
        return;
      }

      if (result.data?.preview && result.data?.assignments) {
        dispatchModal({
          type: MODAL_ACTIONS.OPEN_PREVIEW,
          payload: result.data.assignments,
        });
        // Note: isAssigning stays true — cleared by confirm or cancel
        return;
      }

      await fetchData();
      toast.success(
        `ChoreAI successfully created ${result?.data?.created || 0} new assignments!`
      );
      setIsAssigning(false);
    } catch (error) {
      console.error("Error assigning chores:", error);
      toast.error("An unexpected error occurred while assigning chores.");
      setIsAssigning(false);
    }
  }, [canAccess, fetchData]);

  const handleConfirmAssignments = useCallback(
    async (proposedAssignments) => {
      setIsAssigning(true);
      try {
        // Step 1: Create all assignments
        await Promise.all(proposedAssignments.map((a) => createAssignment(a)));

        // Step 2: Update rotation state (separate try so partial success is visible)
        const rotationUpdates = proposedAssignments
          .filter((a) => a.rotation_update)
          .map((a) => ({
            id: a.chore_id,
            rotation_current_index: a.rotation_update.newIndex,
            rotation_last_assigned_date: a.rotation_update.date,
          }));

        if (rotationUpdates.length > 0) {
          try {
            await Promise.all(
              rotationUpdates.map((update) =>
                updateChore(update.id, {
                  rotation_current_index: update.rotation_current_index,
                  rotation_last_assigned_date:
                    update.rotation_last_assigned_date,
                })
              )
            );
          } catch (rotationError) {
            console.error("Rotation sync failed:", rotationError);
            toast.warning(
              `Assigned ${proposedAssignments.length} chores, but rotation sync failed. Rotations may repeat next week.`
            );
            dispatchModal({ type: MODAL_ACTIONS.CLOSE_PREVIEW });
            await fetchData();
            return;
          }
        }

        toast.success(
          `Successfully assigned ${proposedAssignments.length} chores!`
        );
        dispatchModal({ type: MODAL_ACTIONS.CLOSE_PREVIEW });
        await fetchData();
      } catch (error) {
        console.error("Error confirming assignments:", error);
        toast.error("Failed to create assignments. Please try again.");
      } finally {
        setIsAssigning(false);
      }
    },
    [createAssignment, updateChore, fetchData]
  );

  const handleCancelPreview = useCallback(() => {
    dispatchModal({ type: MODAL_ACTIONS.CLOSE_PREVIEW });
    setIsAssigning(false);
  }, []);

  const handleReassignFromPreview = useCallback(
    (assignment, currentPerson) => {
      const chore = chores.find((c) => c.id === assignment.chore_id);
      dispatchModal({
        type: MODAL_ACTIONS.OPEN_REASSIGN,
        payload: { assignment, chore, currentPerson },
      });
    },
    [chores]
  );

  // Fix: use a unique identifier instead of chore_id to handle recurring chores
  const handleReassignConfirm = useCallback(
    (_assignmentId, newPersonId) => {
      if (!modalState.reassignData) return;

      const targetAssignment = modalState.reassignData.assignment;
      dispatchModal({
        type: MODAL_ACTIONS.UPDATE_PREVIEW,
        payload: modalState.previewAssignments.map((a) =>
          a === targetAssignment ? { ...a, person_id: newPersonId } : a
        ),
      });

      dispatchModal({ type: MODAL_ACTIONS.CLOSE_REASSIGN });
      toast.success("Assignment updated!");
    },
    [modalState.reassignData, modalState.previewAssignments]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Defensive: child without linked account sees a helpful message
  if (isChild && !user?.linked_person_id) {
    return (
      <DashboardShell
        onRefresh={fetchData}
        pointsEarned={pointsEarned}
        showConfetti={false}
      >
        <UnlinkedAccountNotice />
      </DashboardShell>
    );
  }

  // ── Parent view ───────────────────────────────────────────────────────────

  if (isParent) {
    return (
      <DashboardShell
        onRefresh={fetchData}
        pointsEarned={pointsEarned}
        showConfetti={!!completedChoreIdWithConfetti}
      >
        <UpgradeModal
          isOpen={modalState.upgradeOpen}
          onClose={() => dispatchModal({ type: MODAL_ACTIONS.CLOSE_ALL })}
          featureName="ChoreAI Smart Assignment"
          requiredPlan={getTierDisplayName(
            getRequiredTier("choreai_smart_assignment")
          )}
        />

        {modalState.previewOpen && (
          <AssignmentPreview
            proposedAssignments={modalState.previewAssignments}
            onConfirm={handleConfirmAssignments}
            onCancel={handleCancelPreview}
            onReassign={handleReassignFromPreview}
          />
        )}

        {modalState.reassignOpen && modalState.reassignData && (
          <ReassignModal
            isOpen={modalState.reassignOpen}
            onClose={() =>
              dispatchModal({ type: MODAL_ACTIONS.CLOSE_REASSIGN })
            }
            onReassign={handleReassignConfirm}
            assignment={modalState.reassignData.assignment}
            chore={modalState.reassignData.chore}
            currentPerson={modalState.reassignData.currentPerson}
            people={people}
            isProcessing={isAssigning}
          />
        )}

        <ParentDashboard
          assignChoresForWeek={assignChoresForWeek}
          isAssigning={isAssigning}
        />
      </DashboardShell>
    );
  }

  // ── Child / Teen view ─────────────────────────────────────────────────────

  return (
    <DashboardShell
      onRefresh={fetchData}
      pointsEarned={pointsEarned}
      showConfetti={!!completedChoreIdWithConfetti}
    >
      <div className="pb-32 lg:pb-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <LevelProgressCard />
          <StreakDisplay />
        </div>
        <BadgeCollection />

        <div className="funky-card p-6 md:p-8">
          <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3] mb-2">
            My Chores
          </h1>
          <p className="body-font-light text-base md:text-lg text-gray-600">
            Complete your chores and earn rewards! 🌟
          </p>
        </div>

        <DashboardStats
          currentWeekAssignments={currentWeekAssignments}
          completedAssignments={completedAssignments}
          pendingAssignments={pendingAssignments}
          people={people}
        />

        <ChoresSection
          pendingAssignments={pendingAssignments}
          completedAssignments={completedAssignments}
          chores={chores}
          people={people}
          completeChore={completeChore}
          user={user}
          isParent={isParent}
        />
      </div>
    </DashboardShell>
  );
}