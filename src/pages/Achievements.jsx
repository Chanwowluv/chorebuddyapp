import React, { useMemo } from 'react';
import { useData } from '../components/contexts/DataContext';
import { Award, Trophy, Loader2, Lock } from 'lucide-react';
import AchievementBadge, { BADGE_CONFIG } from '../components/gamification/AchievementBadge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Achievements() {
  const { people, user, loading: dataLoading } = useData();

  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['badges', user?.family_id],
    queryFn: async () => {
      if (!user?.family_id) return [];
      const data = await base44.entities.Badge.filter({ family_id: user.family_id });
      return [...data].sort((a, b) => (b.earned_at || '').localeCompare(a.earned_at || ''));
    },
    enabled: !!user?.family_id,
    initialData: []
  });

  const loading = dataLoading || badgesLoading;

  // Group badges by person
  const badgesByPerson = useMemo(() => {
    const grouped = {};
    people.forEach(person => {
      grouped[person.id] = badges.filter(a => a.person_id === person.id);
    });
    return grouped;
  }, [badges, people]);

  // Calculate completion stats
  const stats = useMemo(() => {
    const totalBadges = Object.keys(BADGE_CONFIG).length;
    const earnedBadges = new Set(badges.map(a => a.badge_type)).size;
    return {
      total: totalBadges,
      earned: earnedBadges,
      remaining: totalBadges - earnedBadges,
      percentage: totalBadges > 0 ? Math.round((earnedBadges / totalBadges) * 100) : 0
    };
  }, [badges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 lg:pb-8">
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Achievements</h1>
            <p className="body-font-light text-gray-600 mt-2">
              Unlock badges by completing chores and challenges
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="funky-card bg-blue-50 p-4 text-center">
            <p className="header-font text-3xl text-blue-600">{stats.earned}</p>
            <p className="body-font-light text-sm text-gray-600">Unlocked</p>
          </div>
          <div className="funky-card bg-gray-50 p-4 text-center">
            <p className="header-font text-3xl text-gray-600">{stats.remaining}</p>
            <p className="body-font-light text-sm text-gray-600">Locked</p>
          </div>
          <div className="funky-card bg-green-50 p-4 text-center">
            <p className="header-font text-3xl text-green-600">{stats.percentage}%</p>
            <p className="body-font-light text-sm text-gray-600">Complete</p>
          </div>
          <div className="funky-card bg-purple-50 p-4 text-center">
            <p className="header-font text-3xl text-purple-600">{stats.total}</p>
            <p className="body-font-light text-sm text-gray-600">Total Badges</p>
          </div>
        </div>
      </div>

      {/* Family Members' Achievements */}
      {people.length === 0 && (
        <div className="funky-card p-8 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="body-font text-gray-500">Add family members to start tracking achievements</p>
        </div>
      )}
      {people.map(person => {
        const personBadges = badgesByPerson[person.id] || [];
        const earnedBadgeTypes = new Set(personBadges.map(a => a.badge_type));

        return (
          <div key={person.id} className="funky-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="funky-button w-12 h-12 bg-[#F7A1C4] flex items-center justify-center rounded-full">
                <span className="header-font text-xl text-white">
                  {person.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="header-font text-2xl text-[#2B59C3]">{person.name}</h2>
                <p className="body-font-light text-gray-600">
                  {personBadges.length} {personBadges.length === 1 ? 'badge' : 'badges'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Object.keys(BADGE_CONFIG).map(badgeType => {
                const isEarned = earnedBadgeTypes.has(badgeType);
                
                return (
                  <div
                    key={badgeType}
                    className={`relative ${!isEarned ? 'opacity-40 grayscale' : ''}`}
                  >
                    <AchievementBadge
                      badgeType={badgeType}
                      size="md"
                      showLabel={true}
                      animate={false}
                    />
                    {!isEarned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* All Available Badges Reference */}
      <div className="funky-card p-6 md:p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-[#5E3B85]" />
          <h2 className="header-font text-2xl text-[#2B59C3]">Badge Collection</h2>
        </div>
        <p className="body-font-light text-gray-600 mb-6">
          Complete specific tasks and milestones to unlock these badges!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Object.keys(BADGE_CONFIG).map(badgeType => (
            <AchievementBadge
              key={badgeType}
              badgeType={badgeType}
              size="md"
              showLabel={true}
              animate={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}