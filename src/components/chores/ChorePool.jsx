import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Loader2, Hand, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ChorePool - Shows available chores that children/teens can self-claim.
 * Only visible when family.settings.allow_self_assignment is enabled.
 */
export default function ChorePool() {
  const { chores, assignments, user, family, fetchData } = useData();
  const [claimingId, setClaimingId] = useState(null);

  // Calculate current week start (Monday)
  const weekStartStr = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString().split('T')[0];
  }, []);

  // Filter to pool-eligible chores not yet claimed by this user this week
  const availableChores = useMemo(() => {
    if (!user?.linked_person_id) return [];

    return chores.filter(chore => {
      if (!chore.pool_eligible) return false;

      // Check if already assigned to this user this week
      const alreadyClaimed = assignments.some(
        a => a.chore_id === chore.id &&
          a.person_id === user.linked_person_id &&
          a.week_start === weekStartStr
      );

      return !alreadyClaimed;
    });
  }, [chores, assignments, user, weekStartStr]);

  const handleClaim = async (choreId) => {
    setClaimingId(choreId);
    try {
      const result = await base44.functions.invoke('claimChore', { choreId });
      if (result.error || result.data?.error) {
        throw new Error(result.error || result.data?.error);
      }
      toast.success(`Chore claimed! It's now on your to-do list.`);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to claim chore');
    } finally {
      setClaimingId(null);
    }
  };

  if (availableChores.length === 0) return null;

  return (
    <div className="funky-card p-6 md:p-8">
      <h2 className="header-font text-2xl md:text-3xl text-[#5E3B85] mb-2 flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-[#C3B1E1]" />
        Chore Pool
      </h2>
      <p className="body-font-light text-sm text-gray-600 mb-4">
        Pick a chore to earn extra points!
      </p>

      <div className="grid gap-3">
        {availableChores.map(chore => (
          <div
            key={chore.id}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-[#C3B1E1]/30"
          >
            <div className="flex-1">
              <h3 className="body-font text-base text-gray-800">{chore.title || chore.name}</h3>
              {chore.description && (
                <p className="body-font-light text-xs text-gray-500 mt-1">{chore.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {chore.difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    chore.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    chore.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {chore.difficulty}
                  </span>
                )}
                {(chore.custom_points || chore.points) && (
                  <span className="text-xs text-amber-600 body-font">
                    {chore.custom_points || chore.points} pts
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={() => handleClaim(chore.id)}
              disabled={claimingId === chore.id}
              className="funky-button bg-[#5E3B85] hover:bg-[#4a2e6a] text-white ml-3"
            >
              {claimingId === chore.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Hand className="w-4 h-4 mr-2" />
                  Claim
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
