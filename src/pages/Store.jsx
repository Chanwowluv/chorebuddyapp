import React, { useState, useMemo } from "react";
import { useData } from '../components/contexts/DataContext';
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionAccess } from '../components/hooks/useSubscriptionAccess';
import LimitReachedModal from "../components/ui/LimitReachedModal";
import RedeemableItemFormModal from "../components/store/RedeemableItemFormModal";
import RedeemableItemCard from "../components/store/RedeemableItemCard";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import RedeemConfirmationModal from "../components/store/RedeemConfirmationModal"; // Import new modal
import { format, startOfWeek } from "date-fns";
import AISuggestionsModal from "../components/ai/AISuggestionsModal";
import { isParent as checkParent } from '@/utils/roles';
import ErrorBoundaryWithRetry from '../components/ui/ErrorBoundaryWithRetry';

export default function Store() {
  const { items, rewards, people, user, loading, isProcessing, addItem, updateItem, deleteItem, addReward } = useData();
  const { hasReachedLimit, getTierDisplayName, getRequiredTier, features } = useSubscriptionAccess();
  const isParent = checkParent(user);

  // State for modals
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isLimitModalOpen, setLimitModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false); // New state for redeem modal
  
  // State for items being acted upon
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToRedeem, setItemToRedeem] = useState(null); // New state for item to redeem
  const [isAISuggestionsOpen, setAISuggestionsOpen] = useState(false);

  // Use person.points_balance for accurate lifetime balance
  // (previously calculated from rewards filtered to 60-day window, losing older points)
  const personPoints = useMemo(() => {
    const points = {};
    people.forEach(person => {
      points[person.id] = person.points_balance || 0;
    });
    return points;
  }, [people]);

  const handleShowAddForm = () => {
    if (hasReachedLimit('max_redeemable_items')) {
      setLimitModalOpen(true);
    } else {
      setItemToEdit(null);
      setFormModalOpen(true);
    }
  };

  const handleShowEditForm = (item) => {
    setItemToEdit(item);
    setFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setFormModalOpen(false);
    setItemToEdit(null);
  };

  const handleSubmit = async (itemData) => {
    if (!isParent) {
      toast.error("Only parents can manage reward items");
      return;
    }
    if (itemToEdit) {
      await updateItem(itemToEdit.id, itemData);
      toast.success("Reward item updated!");
    } else {
      await addItem(itemData);
      toast.success("New reward item added!");
    }
    handleCloseFormModal();
  };

  // New function to handle confirmation of deletion
  const handleDeleteConfirm = async () => {
    if (!isParent) {
      toast.error("Only parents can delete reward items");
      return;
    }
    if (itemToDelete) {
      await deleteItem(itemToDelete.id);
      toast.success("Reward item deleted.");
      setItemToDelete(null); // Close the dialog
    }
  };

  // --- NEW REDEMPTION FLOW ---
  const handleShowRedeemModal = (item) => {
    setItemToRedeem(item);
    setIsRedeemModalOpen(true);
  };

  const handleConfirmRedemption = async (personId) => {
    if (!isParent) {
      toast.error("Only parents can process redemptions");
      return;
    }
    if (!itemToRedeem || !personId) {
      toast.error("Could not process redemption.");
      return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        toast.error("Selected person not found.");
        return;
    }

    await addReward({
      person_id: person.id,
      points: -itemToRedeem.cost,
      reward_type: "redemption",
      redeemable_item_id: itemToRedeem.id,
      description: `Redeemed: ${itemToRedeem.name}`,
      week_start: format(startOfWeek(new Date()), "yyyy-MM-dd")
    });

    toast.success(`${itemToRedeem.name} redeemed for ${person.name}!`);
    setIsRedeemModalOpen(false);
    setItemToRedeem(null);
  };

  const handleApplyAISuggestion = async (suggestion) => {
    if (!isParent) {
      toast.error("Only parents can add reward items");
      return;
    }
    const itemData = {
      name: suggestion.name,
      description: suggestion.description,
      cost: suggestion.cost,
      category: suggestion.category,
      icon: suggestion.icon
    };
    await addItem(itemData);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 md:w-16 md:h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <ErrorBoundaryWithRetry level="page">
    <div className="mx-4 md:mx-8 lg:mx-20 pb-32 space-y-6 md:space-y-8 lg:pb-8">
      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        limitType="max_redeemable_items"
        currentCount={items.length}
        maxCount={features.max_redeemable_items}
        requiredTier={getTierDisplayName(getRequiredTier('max_redeemable_items'))}
      />

      <RedeemableItemFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleSubmit}
        itemToEdit={itemToEdit}
        isProcessing={isProcessing}
      />
      
      {/* Confirm Dialog for Deletion */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Reward Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* New Redemption Modal */}
      <RedeemConfirmationModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        onConfirm={handleConfirmRedemption}
        item={itemToRedeem}
        people={people}
        personPoints={personPoints}
        isProcessing={isProcessing}
      />

      <AISuggestionsModal
        isOpen={isAISuggestionsOpen}
        onClose={() => setAISuggestionsOpen(false)}
        suggestionType="rewards"
        onApplySuggestion={handleApplyAISuggestion}
      />

      {/* Header */}
      <div className="funky-card p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
            <div className="funky-button w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-yellow-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
            </div>
            <div className="flex-1">
              <p className="body-font text-base md:text-lg lg:text-xl text-[#FF6B35]">Family</p>
              <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3]">Rewards Store</h1>
              <p className="body-font-light text-sm md:text-base text-gray-600 mt-1 md:mt-2">Redeem points for awesome rewards!</p>
            </div>
          </div>
          {isParent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={handleShowAddForm}
                className="funky-button bg-[#C3B1E1] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font"
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                Add Item
              </Button>
              <Button
                onClick={() => setAISuggestionsOpen(true)}
                className="funky-button bg-[#C3B1E1] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font"
              >
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                AI Suggestions
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Points Summary */}
      {people.length > 0 && (
        <div className="funky-card p-4 md:p-6">
          <h2 className="header-font text-xl md:text-2xl text-[#2B59C3] mb-3 md:mb-4">Family Points</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {people.map((person) => (
              <div key={person.id} className="text-center">
                <div className="funky-button w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border-3 border-[#5E3B85] flex items-center justify-center mx-auto mb-2">
                  <span className="header-font text-sm md:text-lg text-[#5E3B85]">
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="body-font text-xs md:text-sm text-gray-600">{person.name}</p>
                <p className="header-font text-lg md:text-xl text-[#FF6B35]">{personPoints[person.id] || 0} pts</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store Items */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const canAnyoneAfford = people.some(person => (personPoints[person.id] || 0) >= item.cost);
            
            return (
              <RedeemableItemCard
                key={item.id}
                item={item}
                onRedeem={handleShowRedeemModal}
                onEdit={handleShowEditForm}
                onDelete={() => setItemToDelete(item)}
                canAfford={canAnyoneAfford}
                isParent={isParent}
              />
            );
          })}
        </div>
      ) : (
        <div className="funky-card p-12 text-center border-4 border-dashed border-yellow-400">
          <Sparkles className="w-24 h-24 mx-auto mb-6 text-yellow-400" />
          <h3 className="header-font text-3xl text-[#2B59C3] mb-4">No rewards yet!</h3>
          <p className="body-font-light text-gray-600 text-lg mb-8 max-w-md mx-auto">
            Add some exciting rewards that family members can redeem with their points
          </p>
          {isParent && (
            <Button
              onClick={handleShowAddForm}
              className="funky-button bg-yellow-400 text-yellow-800 px-8 py-4 header-font text-xl"
            >
              <Plus className="w-6 h-6 mr-3" />
              Add Your First Reward
            </Button>
          )}
        </div>
      )}
    </div>
    </ErrorBoundaryWithRetry>
  );
}