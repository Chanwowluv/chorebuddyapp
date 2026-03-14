import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import PersonPreferencesForm from "./PersonPreferencesForm";
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess';
import { validateName } from '../utils/validation';
import { sanitizeHTML } from '../lib/sanitization';
import { getMemberLimit } from '@/constants/subscriptionTiers';

export default function PersonFormModal({
  isOpen,
  onClose,
  onSubmit,
  personToEdit,
  isProcessing,
  currentUser,
  peopleCount
}) {
  const { canAccess } = useSubscriptionAccess();
  const [person, setPerson] = useState({
    name: "",
    avatar_color: "lavender",
    role: "parent",
    date_of_birth: "",
    preferred_categories: [],
    avoided_categories: [],
    max_weekly_chores: 5,
    skill_level: "intermediate"
  });

  const isEditMode = !!personToEdit;
  const isPremiumUser = canAccess('advanced_chore_settings');

  useEffect(() => {
    if (isEditMode) {
      setPerson({
        ...personToEdit,
        date_of_birth: personToEdit.date_of_birth || "",
        preferred_categories: personToEdit.preferred_categories || [],
        avoided_categories: personToEdit.avoided_categories || [],
        max_weekly_chores: personToEdit.max_weekly_chores || 5,
        skill_level: personToEdit.skill_level || "intermediate"
      });
    } else {
      setPerson({
        name: "",
        avatar_color: "lavender",
        role: "parent",
        date_of_birth: "",
        preferred_categories: [],
        avoided_categories: [],
        max_weekly_chores: 5,
        skill_level: "intermediate"
      });
    }
  }, [personToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate name
    const nameValidation = validateName(person.name);
    if (!nameValidation.valid) {
      toast.error(nameValidation.error);
      return;
    }
    
    try {
      // Sanitize before submitting
      const sanitizedPerson = {
        ...person,
        name: sanitizeHTML(person.name)
      };
      await onSubmit(sanitizedPerson);
    } catch (error) {
      console.error('Error submitting person form:', error);
      // Error message shown by parent component via DataContext
    }
  };

  const tierLimit = getMemberLimit(currentUser?.subscription_tier || 'free');
  const canAddMore = tierLimit === -1 || peopleCount < tierLimit;

  if (!isOpen) return null;

  if (!isEditMode && !canAddMore) {
      // This case should be handled by the button that opens the modal, but as a fallback:
      onClose(); // Close if opened erroneously
      return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="funky-card max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border-4 border-[#C3B1E1] bg-purple-50"
          >
            <h2 className="header-font text-3xl text-[#2B59C3] mb-6">
              {isEditMode ? 'Edit Family Member' : 'Add New Family Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="body-font text-lg text-[#5E3B85] mb-2 block">Name *</label>
                  <Input
                    placeholder="Enter person's name"
                    value={person.name}
                    onChange={(e) => setPerson({ ...person, name: e.target.value })}
                    className="funky-button border-3 border-[#5E3B85] text-lg p-4 body-font bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="body-font text-lg text-[#5E3B85] mb-2 block">Role</label>
                  <Select value={person.role} onValueChange={(value) => setPerson({ ...person, role: value })}>
                    <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">👨‍👩‍ Parent</SelectItem>
                      <SelectItem value="teen">🧑‍🎓 Teen</SelectItem>
                      <SelectItem value="child">🧒 Child</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="body-font text-lg text-[#5E3B85] mb-2 block">Avatar Color</label>
                  <Select value={person.avatar_color} onValueChange={(value) => setPerson({ ...person, avatar_color: value })}>
                    <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavender">💜 Purple</SelectItem>
                      <SelectItem value="mint">💚 Green</SelectItem>
                      <SelectItem value="blue">💙 Blue</SelectItem>
                      <SelectItem value="peach">🧡 Orange</SelectItem>
                      <SelectItem value="pink">🩷 Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date of Birth (optional) */}
              <div>
                <label className="body-font text-lg text-[#5E3B85] mb-2 block">Date of Birth</label>
                <Input
                  type="date"
                  value={person.date_of_birth}
                  onChange={(e) => setPerson({ ...person, date_of_birth: e.target.value })}
                  className="funky-button border-3 border-[#5E3B85] body-font bg-white max-w-xs"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="body-font-light text-xs text-gray-500 mt-1">
                  Optional — helps ChoreAI suggest age-appropriate chores
                </p>
              </div>

              {/* ChoreAI Preferences - Only for premium users */}
              {isPremiumUser && (
                <PersonPreferencesForm formData={person} setFormData={setPerson} />
              )}

              <div className="flex gap-4 pt-4">
                <Button type="button" onClick={onClose} className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-4 header-font text-lg" disabled={isProcessing}>Cancel</Button>
                <Button type="submit" className="funky-button flex-1 bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-4 header-font text-lg" disabled={isProcessing || !person.name.trim()}>
                  {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</> : isEditMode ? 'Save Changes' : 'Add Person'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}