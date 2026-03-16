import React, { useState, useMemo, useCallback } from "react";
import { useData } from '../components/contexts/DataContext';
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, Zap } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/lib/navigation';
import { toast } from "sonner";
import { ListSkeleton } from '../components/ui/SkeletonLoader';
import ErrorBoundaryWithRetry from '../components/ui/ErrorBoundaryWithRetry';
import PersonCard from "../components/people/PersonCard";
import AbsenceModal from "../components/people/AbsenceModal";
import { base44 } from '@/api/base44Client';
import PersonFormModal from "../components/people/PersonFormModal";
import FamilyInviteModal from "../components/people/FamilyInviteModal";
import LinkAccountModal from "../components/people/LinkAccountModal";
import { useSubscriptionAccess } from '../components/hooks/useSubscriptionAccess';
import LimitReachedModal from "../components/ui/LimitReachedModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { isParent as checkParent } from '@/components/lib/roles';

// Constants
const TOAST_MESSAGES = {
  MEMBER_UPDATED: "Family member updated!",
  MEMBER_ADDED: "New family member added!",
  MEMBER_DELETED: "Family member deleted.",
  ACCOUNT_LINKED: "Account linked successfully!",
  ABSENCE_MARKED: (name) => `${name} marked as absent`,
  ERROR_LINK_ACCOUNT: "Failed to link account",
  ERROR_MARK_ABSENCE: "Failed to mark absence",
  ERROR_PARENT_ONLY_INVITE: "Only parents/guardians can invite family members",
  ERROR_PARENT_ONLY_LINK: "Only parents/guardians can link accounts",
};

const EMPTY_STATE_TIPS = [
  "💡 Tip: Start with parents, then add teens and children",
  "🎯 Pro tip: Assign age-appropriate chores to each family member",
  "⭐ Suggestion: Set up reward points to motivate your family",
];

/**
 * People management page component
 * Handles CRUD operations for family members and related features
 */
export default function People() {
  // Context and hooks
  const {
    people,
    assignments,
    user,
    loading,
    isProcessing,
    addPerson,
    updatePerson,
    deletePerson,
    fetchData
  } = useData();
  
  const { 
    hasReachedLimit, 
    getTierDisplayName, 
    getRequiredTier, 
    canAccess, 
    features 
  } = useSubscriptionAccess();

  // Modal states
  const [modals, setModals] = useState({
    form: false,
    invite: false,
    link: false,
    absence: false,
    limit: false,
  });

  // Entity states
  const [entities, setEntities] = useState({
    personToEdit: null,
    personToDelete: null,
    personToLink: null,
    personForAbsence: null,
  });

  // Processing states
  const [isLinking, setIsLinking] = useState(false);

  // Unlink states
  const [personToUnlink, setPersonToUnlink] = useState(null);

  // Stable random tip that doesn't change on re-render
  const [randomTip] = useState(() => EMPTY_STATE_TIPS[Math.floor(Math.random() * EMPTY_STATE_TIPS.length)]);

  /**
   * Calculate statistics for each person
   * Memoized to prevent unnecessary recalculations
   */
  const personStats = useMemo(() => {
    const stats = {};
    
    people.forEach((person) => {
      const personAssignments = assignments.filter(
        (assignment) => assignment.person_id === person.id
      );
      
      stats[person.id] = {
        completed: personAssignments.filter((a) => a.completed).length,
        current: personAssignments.filter((a) => !a.completed).length,
        total: personAssignments.length,
      };
    });
    
    return stats;
  }, [people, assignments]);

  /**
   * Check if current user is a parent/admin
   */
  const isParent = checkParent(user);

  /**
   * Modal management helpers
   */
  const openModal = useCallback((modalName, entity = null, entityKey = null) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
    if (entity && entityKey) {
      setEntities((prev) => ({ ...prev, [entityKey]: entity }));
    }
  }, []);

  const closeModal = useCallback((modalName, entityKey = null) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    if (entityKey) {
      setEntities((prev) => ({ ...prev, [entityKey]: null }));
    }
  }, []);

  /**
   * Handle showing add person form
   * Checks subscription limits before opening
   */
  const handleShowAddForm = useCallback(() => {
    if (hasReachedLimit('max_family_members')) {
      openModal('limit');
    } else {
      setEntities((prev) => ({ ...prev, personToEdit: null }));
      openModal('form');
    }
  }, [hasReachedLimit, openModal]);

  /**
   * Handle showing edit person form
   */
  const handleShowEditForm = useCallback((person) => {
    setEntities((prev) => ({ ...prev, personToEdit: person }));
    openModal('form');
  }, [openModal]);

  /**
   * Handle form submission for add/edit
   */
  const handleSubmit = useCallback(async (personData) => {
    if (!isParent) {
      toast.error('Only parents can manage family members');
      return;
    }
    try {
      if (entities.personToEdit) {
        await updatePerson(entities.personToEdit.id, personData);
        toast.success(TOAST_MESSAGES.MEMBER_UPDATED);
      } else {
        await addPerson(personData);
        toast.success(TOAST_MESSAGES.MEMBER_ADDED);
      }
      closeModal('form', 'personToEdit');
    } catch (error) {
      console.error('Failed to save person:', error);
      toast.error(error.message || 'Failed to save family member');
    }
  }, [entities.personToEdit, updatePerson, addPerson, closeModal, isParent]);

  /**
   * Handle person deletion
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!isParent) {
      toast.error('Only parents can remove family members');
      return;
    }
    if (!entities.personToDelete) return;

    try {
      await deletePerson(entities.personToDelete.id);
      toast.success(TOAST_MESSAGES.MEMBER_DELETED);
      setEntities((prev) => ({ ...prev, personToDelete: null }));
    } catch (error) {
      console.error('Failed to delete person:', error);
      toast.error(error.message || 'Failed to delete family member');
    }
  }, [entities.personToDelete, deletePerson, isParent]);

  /**
   * Handle showing invite modal
   * Only parents can invite
   */
  const handleShowInviteModal = useCallback(() => {
    if (!isParent) {
      toast.error(TOAST_MESSAGES.ERROR_PARENT_ONLY_INVITE);
      return;
    }
    
    if (canAccess('family_invitations')) {
      openModal('invite');
    }
  }, [isParent, canAccess, openModal]);

  /**
   * Handle successful invitation
   */
  const handleInviteSuccess = useCallback(() => {
    closeModal('invite');
    // Person record will be created when invitation is accepted
  }, [closeModal]);

  /**
   * Handle showing link account modal
   * Only parents can link accounts
   */
  const handleShowLinkModal = useCallback((person) => {
    if (!isParent) {
      toast.error(TOAST_MESSAGES.ERROR_PARENT_ONLY_LINK);
      return;
    }
    
    openModal('link', person, 'personToLink');
  }, [isParent, openModal]);

  /**
   * Handle account linking
   */
  const handleLinkAccount = useCallback(async (personId) => {
    setIsLinking(true);
    
    try {
      const { linkAccountToParent } = await import('@/components/utils/familyLinkingClient');
      await linkAccountToParent(personId);
      toast.success(TOAST_MESSAGES.ACCOUNT_LINKED);
      closeModal('link', 'personToLink');
      await fetchData();
    } catch (error) {
      console.error('Failed to link account:', error);
      toast.error(TOAST_MESSAGES.ERROR_LINK_ACCOUNT);
    } finally {
      setIsLinking(false);
    }
  }, [closeModal]);

  /**
   * Handle marking person as absent
   */
  const handleMarkAbsence = useCallback(async (absenceData) => {
    if (!entities.personForAbsence || !user?.family_id) return;
    
    try {
      await base44.entities.AbsenceRecord.create({
        person_id: entities.personForAbsence.id,
        family_id: user.family_id,
        ...absenceData,
      });
      
      toast.success(TOAST_MESSAGES.ABSENCE_MARKED(entities.personForAbsence.name));
      closeModal('absence', 'personForAbsence');
    } catch (error) {
      console.error('Failed to mark absence:', error);
      toast.error(TOAST_MESSAGES.ERROR_MARK_ABSENCE);
    }
  }, [entities.personForAbsence, user?.family_id, closeModal]);

  /**
   * Handle showing unlink confirmation
   */
  const handleShowUnlinkConfirm = useCallback((person) => {
    if (!isParent) {
      toast.error('Only parents can unlink accounts');
      return;
    }
    setPersonToUnlink(person);
  }, [isParent]);

  /**
   * Handle unlinking a user account from a Person
   */
  const handleUnlinkConfirm = useCallback(async () => {
    if (!personToUnlink) return;

    try {
      const { unlinkAccount } = await import('@/components/utils/familyLinkingClient');
      await unlinkAccount(personToUnlink.id);
      toast.success(`${personToUnlink.name}'s account has been unlinked`);
      await fetchData();
    } catch (error) {
      console.error('Failed to unlink account:', error);
      toast.error('Failed to unlink account');
    } finally {
      setPersonToUnlink(null);
    }
  }, [personToUnlink, fetchData]);

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="mx-1 my-1 pb-10 md:mx-8 lg:mx-20 space-y-6 lg:pb-8">
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <ErrorBoundaryWithRetry level="page">
      <div className="mx-1 my-1 pb-10 md:mx-8 lg:mx-20 space-y-6 md:space-y-8 lg:pb-8">
        
        {/* Limit Reached Modal */}
        <LimitReachedModal
          isOpen={modals.limit}
          onClose={() => closeModal('limit')}
          limitType="max_family_members"
          currentCount={people.length}
          maxCount={features.max_family_members}
          requiredTier={getTierDisplayName(getRequiredTier('max_family_members'))}
        />

        {/* Person Form Modal */}
        <PersonFormModal
          isOpen={modals.form}
          onClose={() => closeModal('form', 'personToEdit')}
          onSubmit={handleSubmit}
          personToEdit={entities.personToEdit}
          isProcessing={isProcessing}
          currentUser={user}
          peopleCount={people.length}
        />

        {/* Family Invite Modal */}
        <FamilyInviteModal
          isOpen={modals.invite}
          onClose={() => closeModal('invite')}
          onSuccess={handleInviteSuccess}
        />

        {/* Link Account Modal */}
        <LinkAccountModal
          isOpen={modals.link}
          onClose={() => closeModal('link', 'personToLink')}
          people={entities.personToLink ? [entities.personToLink] : people}
          onLink={handleLinkAccount}
          isProcessing={isLinking}
        />

        {/* Absence Modal */}
        <AbsenceModal
          isOpen={modals.absence}
          onClose={() => closeModal('absence', 'personForAbsence')}
          person={entities.personForAbsence}
          onSubmit={handleMarkAbsence}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!entities.personToDelete}
          onClose={() => setEntities((prev) => ({ ...prev, personToDelete: null }))}
          onConfirm={handleDeleteConfirm}
          title="Delete Family Member"
          message={`Are you sure you want to delete ${entities.personToDelete?.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />

        {/* Unlink Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!personToUnlink}
          onClose={() => setPersonToUnlink(null)}
          onConfirm={handleUnlinkConfirm}
          title="Unlink Account"
          message={`Are you sure you want to unlink ${personToUnlink?.name}'s account? Their profile will remain but won't be connected to a user account.`}
          confirmText="Unlink"
          cancelText="Cancel"
          variant="warning"
        />

        {/* Page Header */}
        <div className="funky-card p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
              <div className="funky-button w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-[#F7A1C4] flex items-center justify-center">
                <Users className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              
              <div className="flex-1">
                <p className="body-font text-base md:text-lg lg:text-xl text-[#FF6B35]">
                  Household
                </p>
                <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3]">
                  Family Members
                </h1>
                <p className="body-font-light text-sm md:text-base text-gray-600 mt-1 md:mt-2">
                  {people.length} {people.length === 1 ? 'member' : 'members'} in your family
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full">
              {isParent && canAccess('family_invitations') && (
                <Button
                  onClick={handleShowInviteModal}
                  className="funky-button bg-[#C3B1E1] hover:bg-[#B39FD1] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font w-full transition-colors"
                >
                  <Mail className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                  Invite Member
                </Button>
              )}
              
              <Button
                onClick={handleShowAddForm}
                className="funky-button bg-[#F7A1C4] hover:bg-[#F590B4] text-pink-800 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font w-full transition-colors"
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                Add Person
              </Button>
            </div>

            {/* Upgrade CTA for free-tier parents */}
            {isParent && !canAccess('family_invitations') && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="body-font text-sm text-amber-800">
                    Upgrade to Premium to unlock email invitations, smart chore assignment, and more.
                  </p>
                </div>
                <Link to={createPageUrl("Pricing")}>
                  <Button className="funky-button bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2">
                    Upgrade
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* People List or Empty State */}
        {people.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                completedChores={personStats[person.id]?.completed || 0}
                currentChores={personStats[person.id]?.current || 0}
                onEdit={handleShowEditForm}
                onDelete={() => setEntities((prev) => ({ ...prev, personToDelete: person }))}
                onLinkAccount={handleShowLinkModal}
                onUnlinkAccount={handleShowUnlinkConfirm}
                onMarkAbsence={() => openModal('absence', person, 'personForAbsence')}
                canManageLinks={isParent}
              />
            ))}
          </div>
        ) : (
          <div className="funky-card p-8 md:p-12 text-center border-4 border-dashed border-[#F7A1C4] bg-pink-50">
            <div className="mb-6 md:mb-8">
              <Users className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 text-[#F7A1C4]" />
              
              <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-3 md:mb-4">
                No family members yet
              </h3>
              
              <p className="body-font-light text-base md:text-lg mb-2 max-w-md mx-auto">
                Add people to your household to get started with chore assignments
              </p>
              
              <p className="body-font text-sm text-[#5E3B85] mb-6 md:mb-8">
                {randomTip}
              </p>
            </div>
            
            <Button
              onClick={handleShowAddForm}
              className="funky-button bg-[#F7A1C4] hover:bg-[#F590B4] text-white px-6 md:px-8 py-3 md:py-4 header-font text-lg md:text-xl transition-colors"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Add Your First Person
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundaryWithRetry>
  );
}