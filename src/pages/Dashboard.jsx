import React, { useState, useMemo, useCallback } from "react";
import { smartAssignChores } from "@/functions/smartAssignChores";
import { format, startOfWeek } from "date-fns";
import { useData } from '../components/contexts/DataContext';
import { toast } from "sonner";

import { useSubscriptionAccess } from '../components/hooks/useSubscriptionAccess';
import { useChoreManagement } from '../components/hooks/useChoreManagement';
import UpgradeModal from "../components/ui/UpgradeModal";
import AssignmentPreview from "../components/admin/AssignmentPreview";
import ReassignModal from "../components/chores/ReassignModal";

import Confetti from "../components/ui/Confetti";
import ParentDashboard from "../components/dashboard/ParentDashboard";
import DashboardStats from "../components/dashboard/DashboardStats";
import ChoresSection from "../components/dashboard/ChoresSection";
import PointsEarnedNotification from "../components/gamification/PointsEarnedNotification";
import { Loader2 } from "lucide-react";
import { isParent as checkParent, isChild as checkChild } from '@/utils/roles';
import ErrorBoundaryWithRetry from '../components/ui/ErrorBoundaryWithRetry';

export default function Dashboard() {
  const { assignments, chores, people, user, loading, fetchData, createAssignment, updateChore } = useData();
  const { canAccess, getRequiredTier, getTierDisplayName } = useSubscriptionAccess();
  const { completeChore, completedChoreIdWithConfetti, pointsEarned } = useChoreManagement();

  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAssignments, setPreviewAssignments] = useState([]);
  const [isReassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignData, setReassignData] = useState(null);

  const isParent = checkParent(user);
  const isChild = checkChild(user);

  const currentWeekAssignments = useMemo(() => {
    const currentWeek = format(startOfWeek(new Date()), "yyyy-MM-dd");
    let filtered = assignments.filter((assignment) => assignment.week_start === currentWeek);
    
    // For children/teens, only show their own assignments
    if (isChild && user?.linked_person_id) {
      filtered = filtered.filter(a => a.person_id === user.linked_person_id);
    }
    
    return filtered;
  }, [assignments, isChild, user]);

  const assignChoresForWeek = useCallback(async () => {
    if (!canAccess('choreai_smart_assignment')) {
      setUpgradeModalOpen(true);
      return;
    }
    setIsAssigning(true);
    try {
      const result = await smartAssignChores({ preview: true });
      
      if (result.status && result.status >= 400) {
        toast.error(result?.data?.error || "Failed to assign chores.");
        setIsAssigning(false);
      } else if (result.data.preview && result.data.assignments) {
        setPreviewAssignments(result.data.assignments);
        setShowPreview(true);
      } else {
        await fetchData();
        toast.success(`ChoreAI successfully created ${result?.data?.created || 0} new assignments!`);
        setIsAssigning(false);
      }
    } catch (error) {
      console.error("Error assigning chores:", error);
      toast.error("An unexpected error occurred while assigning chores.");
      setIsAssigning(false);
    }
  }, [canAccess, fetchData]);

  const handleConfirmAssignments = async (assignments) => {
    setIsAssigning(true);
    try {
      await Promise.all(
        assignments.map(a => createAssignment(a))
      );

      const rotationUpdates = assignments
        .filter(a => a.rotation_update)
        .map(a => ({
          id: a.chore_id,
          rotation_current_index: a.rotation_update.newIndex,
          rotation_last_assigned_date: a.rotation_update.date
        }));

      if (rotationUpdates.length > 0) {
        await Promise.all(
          rotationUpdates.map(update =>
            updateChore(update.id, {
              rotation_current_index: update.rotation_current_index,
              rotation_last_assigned_date: update.rotation_last_assigned_date
            })
          )
        );
      }

      toast.success(`Successfully assigned ${assignments.length} chores!`);
      setShowPreview(false);
      setPreviewAssignments([]);
      await fetchData();
    } catch (error) {
      console.error("Error confirming assignments:", error);
      toast.error("Failed to create assignments. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReassignFromPreview = (assignment, currentPerson) => {
    const chore = chores.find(c => c.id === assignment.chore_id);
    setReassignData({ assignment, chore, currentPerson });
    setReassignModalOpen(true);
  };

  const handleReassignConfirm = (assignmentId, newPersonId) => {
    setPreviewAssignments(prev =>
      prev.map(a =>
        a.chore_id === reassignData.assignment.chore_id
          ? { ...a, person_id: newPersonId }
          : a
      )
    );
    setReassignModalOpen(false);
    setReassignData(null);
    toast.success("Assignment updated!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 md:w-16 md:h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  const pendingAssignments = currentWeekAssignments.filter((a) => !a.completed);
  const completedAssignments = currentWeekAssignments.filter((a) => a.completed);

  // Show ParentDashboard for parents
  if (isParent) {
    return (
      <ErrorBoundaryWithRetry level="page">
      <div className="min-h-screen relative">
        <PointsEarnedNotification
          points={pointsEarned.amount}
          reason={pointsEarned.reason}
          isVisible={pointsEarned.visible}
          onClose={() => {}}
        />
        
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          featureName="ChoreAI Smart Assignment"
          requiredTier={getTierDisplayName(getRequiredTier('choreai_smart_assignment'))}
        />

        {showPreview && (
          <AssignmentPreview
            proposedAssignments={previewAssignments}
            onConfirm={handleConfirmAssignments}
            onCancel={() => {
              setShowPreview(false);
              setPreviewAssignments([]);
              setIsAssigning(false);
            }}
            onReassign={handleReassignFromPreview}
          />
        )}

        {isReassignModalOpen && reassignData && (
          <ReassignModal
            isOpen={isReassignModalOpen}
            onClose={() => {
              setReassignModalOpen(false);
              setReassignData(null);
            }}
            onReassign={handleReassignConfirm}
            assignment={reassignData.assignment}
            chore={reassignData.chore}
            currentPerson={reassignData.currentPerson}
            people={people}
            isProcessing={false}
          />
        )}

        {completedChoreIdWithConfetti && <Confetti />}
        
        <ParentDashboard
          assignChoresForWeek={assignChoresForWeek}
          isAssigning={isAssigning}
        />
      </div>
      </ErrorBoundaryWithRetry>
    );
  }

  // Child/Teen Dashboard
  return (
    <ErrorBoundaryWithRetry level="page">
    <div className="min-h-screen relative">
      <PointsEarnedNotification
        points={pointsEarned.amount}
        reason={pointsEarned.reason}
        isVisible={pointsEarned.visible}
        onClose={() => {}}
      />

      {completedChoreIdWithConfetti && <Confetti />}
      
      <div className="pb-32 lg:pb-8 space-y-6 md:space-y-8">
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
          people={people} />

        <ChoresSection
          pendingAssignments={pendingAssignments}
          completedAssignments={completedAssignments}
          chores={chores}
          people={people}
          completeChore={completeChore}
          user={user}
          isParent={isParent} />
      </div>
    </div>
    </ErrorBoundaryWithRetry>
  );
}