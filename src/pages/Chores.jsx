import React, { useState } from "react";
import { useData } from '../components/contexts/DataContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Clock, Star, Edit, Trash2, UserPlus, CheckSquare, Sparkles } from "lucide-react";
import { CHORE_CATEGORY_COLORS, DIFFICULTY_STARS } from '@/components/lib/constants';
import { toast } from "sonner";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ChoreRecurrenceForm from "../components/chores/ChoreRecurrenceForm";
import ChoreRotationForm from "../components/chores/ChoreRotationForm";
import SubTaskManager from "../components/chores/SubTaskManager";
import TemplateManager from "../components/chores/TemplateManager";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSubscriptionAccess } from '../components/hooks/useSubscriptionAccess';
import LimitReachedModal from "../components/ui/LimitReachedModal";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EnhancedAssignmentModal from "../components/chores/EnhancedAssignmentModal";
import BulkAssignmentModal from "../components/chores/BulkAssignmentModal";
import AISuggestionsModal from "../components/ai/AISuggestionsModal";
import { isParent as checkParent } from '@/utils/roles';
import { validateName, validateDescription, validateNumber } from '@/components/utils/validation';
import { stripHTMLTags } from '@/components/lib/sanitization';
import ErrorBoundaryWithRetry from '../components/ui/ErrorBoundaryWithRetry';

export default function Chores() {
  const { chores, people, user, loading, isProcessing, addChore, updateChore, deleteChore, createAssignment, fetchData } = useData();
  const { hasReachedLimit, canAccess, getTierDisplayName, getRequiredTier, features } = useSubscriptionAccess();
  const isParent = checkParent(user);
  const [showForm, setShowForm] = useState(false);
  const [choreToEdit, setChoreToEdit] = useState(null);
  const [choreToDelete, setChoreToDelete] = useState(null);
  const [isLimitModalOpen, setLimitModalOpen] = useState(false);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [choreToAssign, setChoreToAssign] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAISuggestionsOpen, setAISuggestionsOpen] = useState(false);
  const getDefaultFormData = () => ({
    title: "",
    description: "",
    difficulty: "medium",
    frequency: "weekly",
    estimated_time: "",
    category: "general",
    priority: "medium",
    is_recurring: false,
    recurrence_pattern: undefined,
    recurrence_day: undefined,
    recurrence_date: undefined,
    auto_assign: true,
    manual_rotation_enabled: false,
    rotation_frequency: undefined,
    rotation_person_order: undefined,
    rotation_current_index: 0,
    custom_points: "",
    requires_approval: false,
    photo_required: false,
    early_completion_bonus: null,
    sub_tasks: [],
    is_template: false,
    template_name: ""
  });
  
  const [formData, setFormData] = useState(getDefaultFormData());

  const handleShowAddForm = () => {
    if (hasReachedLimit('max_chores')) {
      setLimitModalOpen(true);
    } else {
      setChoreToEdit(null);
      setFormData(getDefaultFormData());
      setShowForm(true);
    }
  };

  const handleShowEditForm = (chore) => {
    setChoreToEdit(chore);
    setFormData({
      ...chore,
      estimated_time: chore.estimated_time || "",
      priority: chore.priority || "medium",
      is_recurring: chore.is_recurring || false,
      auto_assign: chore.auto_assign !== false,
      recurrence_pattern: chore.recurrence_pattern || undefined,
      recurrence_day: chore.recurrence_day || undefined,
      recurrence_date: chore.recurrence_date || undefined,
      manual_rotation_enabled: chore.manual_rotation_enabled || false,
      rotation_frequency: chore.rotation_frequency || undefined,
      rotation_person_order: chore.rotation_person_order || undefined,
      rotation_current_index: chore.rotation_current_index || 0,
      custom_points: chore.custom_points || "",
      requires_approval: chore.requires_approval || false,
      photo_required: chore.photo_required || false,
      early_completion_bonus: chore.early_completion_bonus || null,
      sub_tasks: chore.sub_tasks || [],
      is_template: chore.is_template || false,
      template_name: chore.template_name || ""
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setChoreToEdit(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isParent) {
      toast.error("Only parents can manage chores");
      return;
    }
    const titleValidation = validateName(formData.title);
    if (!titleValidation.valid) {
      toast.error(titleValidation.error);
      return;
    }

    if (formData.description) {
      const descValidation = validateDescription(formData.description);
      if (!descValidation.valid) {
        toast.error(descValidation.error);
        return;
      }
    }

    if (formData.estimated_time) {
      const timeValidation = validateNumber(parseInt(formData.estimated_time), 1, 480, 'Estimated time');
      if (!timeValidation.valid) {
        toast.error(timeValidation.error);
        return;
      }
    }

    if (formData.custom_points) {
      const pointsValidation = validateNumber(parseInt(formData.custom_points), 1, 1000, 'Custom points');
      if (!pointsValidation.valid) {
        toast.error(pointsValidation.error);
        return;
      }
    }

    if (formData.is_template && !formData.template_name.trim()) {
      toast.error("Please provide a name for your template");
      return;
    }

    const choreData = {
      ...formData,
      title: stripHTMLTags(formData.title),
      description: stripHTMLTags(formData.description),
      estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
      custom_points: formData.custom_points ? parseInt(formData.custom_points) : null,
      priority_weight: formData.priority === 'high' ? 8 : formData.priority === 'medium' ? 5 : 2
    };

    if (choreToEdit) {
      await updateChore(choreToEdit.id, choreData);
      toast.success(choreData.is_template ? "Template updated!" : "Chore updated!");
    } else {
      await addChore(choreData);
      toast.success(choreData.is_template ? "Template saved!" : "Chore added!");
    }
    handleCancel();
  };

  const handleDeleteConfirm = async () => {
    if (!isParent) {
      toast.error("Only parents can delete chores");
      return;
    }
    if (choreToDelete) {
      await deleteChore(choreToDelete.id);
      toast.success("Chore deleted.");
      setChoreToDelete(null);
    }
  };

  const handleShowAssignModal = (chore) => {
    if (people.length === 0) {
      toast.error("Add family members first before assigning chores.");
      return;
    }
    setChoreToAssign(chore);
    setAssignModalOpen(true);
  };

  const handleAssignChore = async (assignments) => {
    if (!isParent) {
      toast.error("Only parents can assign chores");
      return;
    }
    setIsAssigning(true);
    try {
      // assignments is now an array from the enhanced modal
      await Promise.all(assignments.map(a => {
        const assignmentData = {
          ...a,
          family_id: user.family_id
        };
        return createAssignment(assignmentData);
      }));
      toast.success(`Successfully created ${assignments.length} assignment${assignments.length > 1 ? 's' : ''}!`);
      setAssignModalOpen(false);
      setChoreToAssign(null);
      await fetchData();
    } catch (error) {
      console.error("[Chores] Error assigning chore:", error);
      toast.error("Failed to assign chore. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async ({ choreIds, personIds, week_start, due_date }) => {
    if (!isParent) {
      toast.error("Only parents can assign chores");
      return;
    }
    setIsAssigning(true);
    try {
      const assignments = [];
      for (const choreId of choreIds) {
        for (const personId of personIds) {
          assignments.push({
            chore_id: choreId,
            person_id: personId,
            week_start,
            due_date,
            family_id: user.family_id,
            completed: false
          });
        }
      }

      // Create all assignments via server-validated parentCrud
      await Promise.all(assignments.map(a => createAssignment(a)));
      
      toast.success(`Successfully assigned ${assignments.length} chores!`);
      setBulkAssignModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("[Chores] Error bulk assigning chores:", error);
      toast.error("Failed to assign chores. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleShowBulkAssign = () => {
    if (people.length === 0) {
      toast.error("Add family members first before assigning chores.");
      return;
    }
    if (chores.length === 0) {
      toast.error("Create some chores first before bulk assigning.");
      return;
    }
    setBulkAssignModalOpen(true);
  };

  const handleApplyAISuggestion = async (suggestion) => {
    if (!isParent) {
      toast.error("Only parents can add chores");
      return;
    }
    const choreData = {
      title: suggestion.title,
      description: suggestion.description,
      difficulty: suggestion.difficulty,
      category: suggestion.category,
      estimated_time: suggestion.estimated_time,
      priority: 'medium',
      auto_assign: true
    };
    await addChore(choreData);
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading chores..." />;
  }

  return (
    <ErrorBoundaryWithRetry level="page">
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 md:space-y-8 lg:pb-8">
      <ConfirmDialog
        isOpen={!!choreToDelete}
        onClose={() => setChoreToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Chore"
        message={`Are you sure you want to delete "${choreToDelete?.title}"? This will not affect past assignments.`}
        confirmText="Delete"
        cancelText="Keep"
      />

      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        limitType="max_chores"
        currentCount={chores.length}
        maxCount={features.max_chores}
        requiredTier={getTierDisplayName(getRequiredTier('max_chores'))}
      />

      <EnhancedAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setChoreToAssign(null);
        }}
        onAssign={handleAssignChore}
        chore={choreToAssign}
        people={people}
        isProcessing={isAssigning}
        familyId={user?.family_id}
      />

      <BulkAssignmentModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setBulkAssignModalOpen(false)}
        onBulkAssign={handleBulkAssign}
        chores={chores}
        people={people}
        isProcessing={isAssigning}
      />

      <AISuggestionsModal
        isOpen={isAISuggestionsOpen}
        onClose={() => setAISuggestionsOpen(false)}
        suggestionType="chores"
        onApplySuggestion={handleApplyAISuggestion}
      />

      {/* Header */}
      <div className="funky-card p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
            <div className="funky-button w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-[#FF6B35] flex items-center justify-center">
              <ClipboardList className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
            </div>
            <div className="flex-1">
              <p className="body-font text-base md:text-lg lg:text-xl text-[#F7A1C4]">Household</p>
              <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3]">Chore Library</h1>
              <p className="body-font-light text-sm md:text-base text-gray-600 mt-1 md:mt-2">{chores.length} {chores.length === 1 ? 'chore' : 'chores'} in your library</p>
            </div>
          </div>
          {isParent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleShowAddForm}
                className="funky-button bg-[#C3B1E1] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font"
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                Add Chore
              </Button>
              <Button
                onClick={handleShowBulkAssign}
                className="funky-button bg-[#FF6B35] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font"
              >
                <CheckSquare className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                Bulk Assign
              </Button>
              <Button
                onClick={() => setAISuggestionsOpen(true)}
                className="funky-button bg-[#C3B1E1] text-white px-4 md:px-6 py-3 md:py-4 text-base md:text-lg lg:text-xl header-font"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                AI Suggestions
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Tooltip */}
      {isParent && (
        <div className="funky-card p-4 bg-purple-50 border-2 border-purple-300">
          <p className="body-font text-sm text-purple-800">
            👑 <strong>Admin Mode:</strong> Hover over any chore to assign it, or use <strong>Bulk Assign</strong> to assign multiple chores at once.
          </p>
        </div>
      )}

      {/* Add/Edit Chore Form */}
      {showForm && (
        <div className="funky-card p-6 md:p-8 border-4 border-[#FF6B35]">
          <h2 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4 md:mb-6">
            {choreToEdit ? 'Edit Chore' : 'Add New Chore'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Chore Title</label>
              <Input
                placeholder="e.g., 'Vacuum living room'"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="funky-button border-3 border-[#5E3B85] text-base md:text-lg p-3 md:p-4 body-font bg-white"
                required
              />
            </div>
            <div>
              <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Description</label>
              <Textarea
                placeholder="Describe what needs to be done..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="funky-button border-3 border-[#5E3B85] p-3 md:p-4 h-20 md:h-24 body-font bg-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div>
                <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Category</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="bathroom">Bathroom</SelectItem>
                    <SelectItem value="bedroom">Bedroom</SelectItem>
                    <SelectItem value="laundry">Laundry</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="pets">Pets</SelectItem>
                    <SelectItem value="dishes">Dishes</SelectItem>
                    <SelectItem value="vacuuming">Vacuuming</SelectItem>
                    <SelectItem value="organizing">Organizing</SelectItem>
                    <SelectItem value="trash">Trash</SelectItem>
                    <SelectItem value="cooking">Cooking</SelectItem>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Priority</label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Difficulty</label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="body-font text-base md:text-lg text-[#5E3B85] mb-2 block">Time (minutes)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={formData.estimated_time}
                  onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                  className="funky-button border-3 border-[#5E3B85] body-font bg-white"
                />
              </div>
            </div>

            {/* Sub-tasks */}
            <SubTaskManager 
              subTasks={formData.sub_tasks} 
              setSubTasks={(tasks) => setFormData({ ...formData, sub_tasks: tasks })} 
            />

            {/* Template Manager */}
            <TemplateManager
              chores={chores}
              onLoadTemplate={(templateData) => setFormData({ ...formData, ...templateData })}
              onDeleteTemplate={(id) => deleteChore(id)}
              isTemplate={formData.is_template}
              templateName={formData.template_name}
              setIsTemplate={(val) => setFormData({ ...formData, is_template: val })}
              setTemplateName={(val) => setFormData({ ...formData, template_name: val })}
            />

            {/* Auto-assign toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_assign"
                checked={formData.auto_assign}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_assign: checked })}
                className="border-2 border-[#5E3B85]"
              />
              <Label htmlFor="auto_assign" className="body-font text-base text-[#5E3B85]">
                🤖 Let ChoreAI assign this chore automatically
              </Label>
            </div>

            {/* Premium Features */}
            {canAccess('advanced_chore_settings') ? (
              <div className="space-y-4 p-4 funky-card border-2 border-[#C3B1E1] bg-purple-50">
                <h3 className="header-font text-xl text-[#2B59C3]">⭐ Premium Features</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="body-font text-base text-[#5E3B85] mb-2 block">Custom Points</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Leave empty for default points"
                      value={formData.custom_points}
                      onChange={(e) => setFormData({ ...formData, custom_points: e.target.value })}
                      className="funky-button border-2 border-[#5E3B85] body-font bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires_approval"
                      checked={formData.requires_approval}
                      onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                      className="border-2 border-[#5E3B85]"
                    />
                    <Label htmlFor="requires_approval" className="body-font text-base text-[#5E3B85]">
                      📋 Requires admin approval
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="photo_required"
                      checked={formData.photo_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, photo_required: checked })}
                      className="border-2 border-[#5E3B85]"
                    />
                    <Label htmlFor="photo_required" className="body-font text-base text-[#5E3B85]">
                      📷 Requires photo proof
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 funky-card border-2 border-gray-300 bg-gray-50">
                <h3 className="header-font text-xl text-gray-600">🔒 Premium Features</h3>
                <p className="body-font-light text-gray-500 text-sm">
                  Unlock custom points, approval workflows, and photo verification with a paid subscription.
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="funky-button bg-[#FF6B35] text-white px-4 py-2 text-sm header-font">
                    View Plans
                  </Button>
                </Link>
              </div>
            )}

            {/* Recurrence Form - Only show for basic or higher */}
            {canAccess('recurring_chores') && (
              <ChoreRecurrenceForm formData={formData} setFormData={setFormData} />
            )}

            {/* Manual Rotation Form */}
            <ChoreRotationForm formData={formData} setFormData={setFormData} />

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-3 md:py-4 header-font text-base md:text-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.title.trim()}
                className="funky-button flex-1 bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-3 md:py-4 header-font text-base md:text-lg"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="small" />
                    {choreToEdit ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  choreToEdit ? 'Save Changes' : 'Add Chore'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Chores Grid */}
      {chores.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chores.map((chore) => (
            <div key={chore.id} className={`funky-card p-4 md:p-6 lg:p-8 border-4 relative group ${CHORE_CATEGORY_COLORS[chore.category] || CHORE_CATEGORY_COLORS.general}`}>
              {isParent && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleShowAssignModal(chore)}
                    className="h-8 w-8 rounded-full hover:bg-green-100"
                    title="Assign to someone"
                  >
                    <UserPlus className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleShowEditForm(chore)}
                    className="h-8 w-8 rounded-full hover:bg-black/10"
                  >
                    <Edit className="w-4 h-4 text-[#5E3B85]" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setChoreToDelete(chore)}
                    className="h-8 w-8 rounded-full hover:bg-black/10"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-16">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="header-font text-xl md:text-2xl text-[#2B59C3]">{chore.title}</h3>
                    {chore.priority && (
                      <div className={`funky-button px-3 py-1 border-2 ${
                        chore.priority === 'high' ? 'bg-red-100 border-red-400' :
                        chore.priority === 'medium' ? 'bg-yellow-100 border-yellow-400' :
                        'bg-green-100 border-green-400'
                      }`}>
                        <span className={`body-font text-xs ${
                          chore.priority === 'high' ? 'text-red-700' :
                          chore.priority === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {chore.priority === 'high' ? '🔴 HIGH' : 
                           chore.priority === 'medium' ? '🟡 MED' : '🟢 LOW'}
                        </span>
                      </div>
                    )}
                    {chore.is_recurring && (
                      <div className="funky-button px-3 py-1 bg-[#C3B1E1] border-2 border-[#5E3B85]">
                        <span className="body-font text-xs text-white">🔄 RECURRING</span>
                      </div>
                    )}
                    {chore.is_template && (
                      <div className="funky-button px-3 py-1 bg-blue-100 border-2 border-blue-400">
                        <span className="body-font text-xs text-blue-700">📋 TEMPLATE</span>
                      </div>
                    )}
                    {!chore.auto_assign && !chore.manual_rotation_enabled && (
                      <div className="funky-button px-3 py-1 bg-gray-200 border-2 border-gray-400">
                        <span className="body-font text-xs text-gray-600">MANUAL ONLY</span>
                      </div>
                    )}
                    {chore.manual_rotation_enabled && (
                      <div className="funky-button px-3 py-1 bg-[#2B59C3] border-2 border-[#5E3B85]">
                        <span className="body-font text-xs text-white">🔄 ROTATING</span>
                      </div>
                    )}
                    {chore.requires_approval && (
                      <div className="funky-button px-3 py-1 bg-blue-100 border-2 border-blue-400">
                        <span className="body-font text-xs text-blue-700">📋 APPROVAL</span>
                      </div>
                    )}
                    {chore.photo_required && (
                      <div className="funky-button px-3 py-1 bg-green-100 border-2 border-green-400">
                        <span className="body-font text-xs text-green-700">📷 PHOTO</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mb-3 flex-wrap">
                    <div className="funky-button px-4 py-2 bg-white border-2 border-[#5E3B85]">
                      <span className="body-font text-sm text-[#5E3B85] capitalize">
                        {chore.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(DIFFICULTY_STARS[chore.difficulty])].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-500" />
                      ))}
                    </div>
                    {chore.custom_points && (
                      <div className="funky-button px-4 py-2 bg-white border-2 border-[#F7A1C4]">
                        <span className="body-font text-sm text-[#F7A1C4]">{chore.custom_points} pts</span>
                      </div>
                    )}
                  </div>
                </div>
                {chore.estimated_time && (
                  <div className="flex items-center gap-2 text-[#5E3B85] flex-shrink-0">
                    <Clock className="w-5 h-5" />
                    <span className="body-font text-lg">{chore.estimated_time} min</span>
                  </div>
                )}
              </div>
              {chore.description && (
                <p className="body-font-light text-base md:text-lg leading-relaxed mb-3">
                  {chore.description}
                </p>
              )}
              {chore.sub_tasks && chore.sub_tasks.length > 0 && (
                <div className="mt-3 p-3 funky-card border-2 border-gray-300 bg-white/50">
                  <p className="body-font text-sm text-gray-700 mb-2">Sub-tasks:</p>
                  <ul className="space-y-1">
                    {chore.sub_tasks.map((task) => (
                      <li key={task.id} className="body-font-light text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5E3B85]"></span>
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="funky-card p-6 md:p-12 text-center border-4 border-dashed border-[#FF6B35]">
          <ClipboardList className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 text-[#FF6B35]" />
          <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4">No chores created yet</h3>
          <p className="body-font-light text-gray-600 text-base md:text-lg mb-8 max-w-md mx-auto">
            Start by adding some chores that need to be done around the house
          </p>
          {isParent && (
            <Button
              onClick={handleShowAddForm}
              className="funky-button bg-[#FF6B35] text-white px-6 py-3 header-font text-lg md:text-xl"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6 mr-3" />
              Add Your First Chore
            </Button>
          )}
        </div>
      )}
    </div>
    </ErrorBoundaryWithRetry>
  );
}