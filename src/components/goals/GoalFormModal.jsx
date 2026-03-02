import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { format, addWeeks, addMonths } from 'date-fns';
import { validateName, validateNumber, validateDescription } from '@/components/utils/validation';
import { stripHTMLTags } from '@/components/lib/sanitization';
import { toast } from 'sonner';

export default function GoalFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  goalToEdit, 
  currentFamilyPoints 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_points: '',
    reward_description: '',
    goal_type: 'weekly',
    end_date: ''
  });

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        title: goalToEdit.title || '',
        description: goalToEdit.description || '',
        target_points: goalToEdit.target_points?.toString() || '',
        reward_description: goalToEdit.reward_description || '',
        goal_type: goalToEdit.goal_type || 'weekly',
        end_date: goalToEdit.end_date || ''
      });
    } else {
      const suggestedEndDate = format(addWeeks(new Date(), 1), 'yyyy-MM-dd');
      setFormData({
        title: '',
        description: '',
        target_points: '',
        reward_description: '',
        goal_type: 'weekly',
        end_date: suggestedEndDate
      });
    }
  }, [goalToEdit, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

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

    const pointsValidation = validateNumber(parseInt(formData.target_points), 1, 100000, 'Target points');
    if (!pointsValidation.valid) {
      toast.error(pointsValidation.error);
      return;
    }

    if (!formData.reward_description.trim()) {
      toast.error('Reward description is required');
      return;
    }

    const goalData = {
      ...formData,
      title: stripHTMLTags(formData.title),
      description: stripHTMLTags(formData.description),
      reward_description: stripHTMLTags(formData.reward_description),
      target_points: parseInt(formData.target_points),
      start_date: format(new Date(), 'yyyy-MM-dd')
    };

    onSubmit(goalData);
  };

  const handleGoalTypeChange = (type) => {
    setFormData({ ...formData, goal_type: type });
    
    // Auto-suggest end date based on goal type
    const suggestedEndDate = type === 'weekly' 
      ? format(addWeeks(new Date(), 1), 'yyyy-MM-dd')
      : type === 'monthly'
        ? format(addMonths(new Date(), 1), 'yyyy-MM-dd')
        : formData.end_date;
    
    setFormData(prev => ({ ...prev, end_date: suggestedEndDate }));
  };

  const getSuggestedPoints = () => {
    const multiplier = formData.goal_type === 'weekly' ? 1 : formData.goal_type === 'monthly' ? 4 : 2;
    return Math.max(currentFamilyPoints + (50 * multiplier), 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="funky-card max-w-2xl border-4 border-green-400">
        <DialogHeader>
          <DialogTitle className="header-font text-3xl text-[#2B59C3] flex items-center justify-between">
            {goalToEdit ? 'Edit Family Goal' : 'Create Family Goal'}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">Goal Title *</label>
            <Input
              placeholder="e.g., 'Clean House Challenge'"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] text-lg p-4 body-font bg-white"
              required
            />
          </div>

          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">Description</label>
            <Textarea
              placeholder="Describe the goal and what the family needs to accomplish..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] p-4 h-24 body-font bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="body-font text-lg text-[#5E3B85] mb-2 block">Goal Type</label>
              <Select value={formData.goal_type} onValueChange={handleGoalTypeChange}>
                <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">📅 Weekly Goal</SelectItem>
                  <SelectItem value="monthly">🗓️ Monthly Goal</SelectItem>
                  <SelectItem value="custom">⚙️ Custom Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="body-font text-lg text-[#5E3B85] mb-2 block">End Date</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="funky-button border-3 border-[#5E3B85] body-font bg-white"
              />
            </div>
          </div>

          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">
              Target Points *
              <span className="body-font-light text-sm text-gray-600 ml-2">
                (Suggested: {getSuggestedPoints()})
              </span>
            </label>
            <Input
              type="number"
              min="1"
              placeholder={getSuggestedPoints().toString()}
              value={formData.target_points}
              onChange={(e) => setFormData({ ...formData, target_points: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] text-lg p-4 body-font bg-white"
              required
            />
          </div>

          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">Reward Description *</label>
            <Textarea
              placeholder="e.g., 'Family movie night with pizza and ice cream'"
              value={formData.reward_description}
              onChange={(e) => setFormData({ ...formData, reward_description: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] p-4 h-24 body-font bg-white"
              required
            />
          </div>

          {/* Current Family Points Display */}
          <div className="funky-card p-4 bg-blue-50 border-2 border-blue-200">
            <div className="text-center">
              <div className="header-font text-2xl text-blue-600">{currentFamilyPoints}</div>
              <div className="body-font-light text-sm text-blue-700">Current Family Points</div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-4 header-font text-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim() || !formData.target_points || !formData.reward_description.trim()}
              className="funky-button flex-1 bg-green-400 hover:bg-green-500 text-white py-4 header-font text-lg"
            >
              {goalToEdit ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}