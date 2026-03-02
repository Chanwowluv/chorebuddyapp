
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import { REWARD_ICON_NAMES, REWARD_ICONS } from '@/components/lib/constants';
import { validateName, validateNumber } from '@/components/utils/validation';
import { stripHTMLTags } from '@/components/lib/sanitization';
import { toast } from 'sonner';

export default function RedeemableItemFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  itemToEdit, 
  isProcessing 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: '',
    category: 'other',
    icon: 'Gift'
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        name: itemToEdit.name || '',
        description: itemToEdit.description || '',
        cost: itemToEdit.cost?.toString() || '',
        category: itemToEdit.category || 'other',
        icon: itemToEdit.icon || 'Gift'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        cost: '',
        category: 'other',
        icon: 'Gift'
      });
    }
  }, [itemToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const nameValidation = validateName(formData.name);
    if (!nameValidation.valid) {
      toast.error(nameValidation.error);
      return;
    }

    const costValidation = validateNumber(parseInt(formData.cost), 1, 10000, 'Cost');
    if (!costValidation.valid) {
      toast.error(costValidation.error);
      return;
    }

    const itemData = {
      ...formData,
      name: stripHTMLTags(formData.name),
      description: stripHTMLTags(formData.description),
      cost: parseInt(formData.cost)
    };

    onSubmit(itemData);
  };

  const handleClose = () => {
    onClose();
    setFormData({
      name: '',
      description: '',
      cost: '',
      category: 'other',
      icon: 'Gift'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="funky-card max-w-lg border-4 border-[#FF6B35]">
        <DialogHeader>
          <DialogTitle className="header-font text-3xl text-[#2B59C3] flex items-center justify-between">
            {itemToEdit ? 'Edit Reward Item' : 'Add Reward Item'}
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-6 h-6" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">Item Name</label>
            <Input
              placeholder="e.g., 'Extra 30 minutes screen time'"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] text-lg p-4 body-font bg-white"
              required
            />
          </div>

          <div>
            <label className="body-font text-lg text-[#5E3B85] mb-2 block">Description</label>
            <Textarea
              placeholder="Describe the reward..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="funky-button border-3 border-[#5E3B85] p-4 h-24 body-font bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="body-font text-lg text-[#5E3B85] mb-2 block">Cost (Points)</label>
              <Input
                type="number"
                min="1"
                placeholder="50"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="funky-button border-3 border-[#5E3B85] body-font bg-white"
                required
              />
            </div>

            <div>
              <label className="body-font text-lg text-[#5E3B85] mb-2 block">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="privileges">Privileges</SelectItem>
                  <SelectItem value="treats">Treats</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="body-font text-lg text-[#5E3B85] mb-2 block">Icon</label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_ICON_NAMES.map((iconName) => {
                    const IconComponent = REWARD_ICONS[iconName];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          <span>{iconName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-4 header-font text-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || !formData.name.trim() || !formData.cost}
              className="funky-button flex-1 bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-4 header-font text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {itemToEdit ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                itemToEdit ? 'Save Changes' : 'Add Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
