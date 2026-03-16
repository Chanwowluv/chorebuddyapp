import React, { useState } from 'react';
import { useData } from '../components/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Plus, Trophy, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { stripHTMLTags } from '@/components/lib/sanitization';
import { useQuery } from '@tanstack/react-query';
import ChallengeCard from '../components/challenges/ChallengeCard';
import ChallengeFormModal from '../components/challenges/ChallengeFormModal';
import { isParent as checkParent } from '@/utils/roles';

export default function Challenges() {
  const { people, user, loading: dataLoading } = useData();
  const [isFormModalOpen, setFormModalOpen] = useState(false);

  const { data: challenges = [], isLoading: challengesLoading, refetch } = useQuery({
    queryKey: ['challenges', user?.family_id],
    queryFn: async () => {
      if (!user?.family_id) return [];
      const data = await base44.entities.FamilyChallenge.filter({ family_id: user.family_id });
      return [...data].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!user?.family_id,
    initialData: []
  });

  const loading = dataLoading || challengesLoading;

  const activeChallenges = challenges.filter(c => c.status === 'active' && new Date(c.end_date) > new Date());
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  const handleSubmit = async (challengeData) => {
    try {
      await base44.entities.FamilyChallenge.create({
        ...challengeData,
        title: stripHTMLTags(challengeData.title),
        description: stripHTMLTags(challengeData.description),
        family_id: user.family_id,
        current_value: 0,
        status: 'active'
      });
      toast.success('Challenge created!');
      setFormModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  const isAdmin = checkParent(user);
  if (!isAdmin) {
    return (
      <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 lg:pb-8">
        {/* View-only for children */}
        <div className="funky-card p-6 md:p-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Family Challenges</h1>
              <p className="body-font-light text-gray-600 mt-2">
                Work together to complete time-limited goals!
              </p>
            </div>
          </div>
        </div>

        {activeChallenges.length > 0 ? (
          <div className="space-y-6">
            <h2 className="header-font text-2xl text-[#2B59C3]">Active Challenges</h2>
            {activeChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} people={people} />
            ))}
          </div>
        ) : (
          <div className="funky-card p-12 text-center border-4 border-dashed border-purple-300 bg-purple-50">
            <Target className="w-20 h-20 mx-auto mb-6 text-purple-400" />
            <h3 className="header-font text-3xl text-purple-700 mb-4">No Active Challenges</h3>
            <p className="body-font-light text-lg text-purple-600">
              Ask a parent to create a family challenge!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 lg:pb-8">
      <ChallengeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSubmit}
        people={people}
      />

      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Family Challenges</h1>
              <p className="body-font-light text-gray-600 mt-2">
                Create time-limited goals with bonus rewards
              </p>
            </div>
          </div>
          <Button
            onClick={() => setFormModalOpen(true)}
            className="funky-button bg-[#FF6B35] text-white px-6 py-4 text-lg header-font"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Challenge
          </Button>
        </div>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="header-font text-2xl text-[#2B59C3]">Active Challenges</h2>
          {activeChallenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} people={people} />
          ))}
        </div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="header-font text-2xl text-green-600">Completed Challenges</h2>
          {completedChallenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} people={people} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <div className="funky-card p-12 text-center border-4 border-dashed border-purple-300 bg-purple-50">
          <Target className="w-20 h-20 mx-auto mb-6 text-purple-400" />
          <h3 className="header-font text-3xl text-purple-700 mb-4">No Challenges Yet</h3>
          <p className="body-font-light text-lg text-purple-600 mb-8">
            Create your first family challenge to boost motivation!
          </p>
          <Button
            onClick={() => setFormModalOpen(true)}
            className="funky-button bg-[#FF6B35] text-white px-8 py-4 text-xl header-font"
          >
            <Plus className="w-6 h-6 mr-3" />
            Create Challenge
          </Button>
        </div>
      )}
    </div>
  );
}