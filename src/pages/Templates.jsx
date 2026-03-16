import React from 'react';
import { useData } from '../components/contexts/DataContext';
import { BookOpen, Loader2 } from 'lucide-react';
import TemplateLibrary from '../components/templates/TemplateLibrary';
import { toast } from 'sonner';
import { isParent as checkParent } from '@/utils/roles';

export default function Templates() {
  const { loading, addChore, user } = useData();

  const isParent = checkParent(user);

  const handleApplyTemplate = async (chores) => {
    if (!user?.family_id) {
      toast.error('No family found');
      return;
    }

    if (!isParent) {
      toast.error('Only parents can apply templates');
      return;
    }

    try {
      await Promise.all(chores.map(choreData => addChore(choreData)));
      toast.success(`Added ${chores.length} chores from template!`);
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-8 lg:pb-8">
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-[#C3B1E1] flex items-center justify-center">
            <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">
              Chore Templates
            </h1>
            <p className="body-font-light text-gray-600 mt-2">
              Quick-start chore packs organized by age group
            </p>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <TemplateLibrary onApplyTemplate={handleApplyTemplate} />
    </div>
  );
}