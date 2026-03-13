import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useData } from "../contexts/DataContext";
import { formatDistanceToNow } from "date-fns";
import { Lock, ChevronRight, Medal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BADGE_CATALOG = [
  { id: "first_chore", title: "First Steps", icon: "👣", description: "Complete your first chore" },
  { id: "streak_3", title: "On a Roll", icon: "🔥", description: "3-day chore streak" },
  { id: "streak_7", title: "Week Warrior", icon: "💪", description: "7-day chore streak" },
  { id: "streak_14", title: "Unstoppable", icon: "⚡", description: "14-day chore streak" },
  { id: "streak_30", title: "Streak Master", icon: "🌋", description: "30-day chore streak" },
  { id: "chores_10", title: "Getting Started", icon: "🧹", description: "Complete 10 chores" },
  { id: "chores_25", title: "Chore Champ", icon: "🥈", description: "Complete 25 chores" },
  { id: "chores_50", title: "Half Century", icon: "🥇", description: "Complete 50 chores" },
  { id: "chores_100", title: "Centurion", icon: "💯", description: "Complete 100 chores" },
  { id: "category_master", title: "Category Master", icon: "🎯", description: "Complete 10+ chores in one category" },
  { id: "level_up", title: "Level Up!", icon: "⬆️", description: "Reach a new level" },
  { id: "points_100", title: "Point Collector", icon: "💰", description: "Earn 100 total points" },
  { id: "points_500", title: "Point Hoarder", icon: "💎", description: "Earn 500 total points" },
  { id: "points_1000", title: "Point Legend", icon: "👑", description: "Earn 1000 total points" },
  { id: "perfect_week", title: "Perfect Week", icon: "✨", description: "Complete all assigned chores in a week" }
];

export default function BadgeCollection() {
  const { getCurrentPerson } = useData();
  const myPerson = getCurrentPerson();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!myPerson?.id) return;

    const fetchBadges = async () => {
      try {
        setLoading(true);
        const fetchedBadges = await base44.entities.Badge.filter({ person_id: myPerson.id });
        // Sort by earned_at descending
        fetchedBadges.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at));
        setBadges(fetchedBadges);
      } catch (error) {
        console.error("Failed to fetch badges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [myPerson?.id]);

  const recentBadges = badges.slice(0, 5);
  const earnedBadgeIds = new Set(badges.map(b => b.badge_type));

  if (!myPerson) return null;

  return (
    <div className="funky-card p-6 bg-white border-purple-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-purple-500" />
          <h3 className="header-font text-xl text-purple-900">My Badges</h3>
          <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
            {myPerson.badges_count || badges.length}
          </span>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-sm body-font font-bold text-purple-600 hover:text-purple-800 flex items-center transition-colors"
        >
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : badges.length === 0 ? (
        <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
          <p className="text-3xl mb-2">🏆</p>
          <p className="body-font font-bold text-purple-800">Earn your first badge!</p>
          <p className="text-sm body-font-light text-purple-600 mt-1">Complete chores to start your collection.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {recentBadges.map((badge) => {
            const catalogInfo = BADGE_CATALOG.find(c => c.id === badge.badge_type) || {};
            return (
              <div 
                key={badge.id} 
                className="flex flex-col items-center justify-center bg-purple-50 rounded-xl p-3 border border-purple-100 min-w-[80px] hover:scale-105 transition-transform"
                title={badge.badge_title}
              >
                <span className="text-3xl mb-1 drop-shadow-sm">{badge.badge_icon || catalogInfo.icon || "🏆"}</span>
                <span className="text-[10px] font-bold text-purple-900 text-center leading-tight line-clamp-1 w-full max-w-[70px]">
                  {badge.badge_title}
                </span>
                <span className="text-[9px] text-purple-500 mt-1 text-center">
                  {formatDistanceToNow(new Date(badge.earned_at))} ago
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-3xl border-4 border-[#5E3B85]">
          <DialogHeader>
            <DialogTitle className="header-font text-2xl text-[#5E3B85] flex items-center gap-2">
              <Medal className="w-6 h-6" /> Badge Collection
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 pb-4">
            {BADGE_CATALOG.map((catalogItem) => {
              const isEarned = earnedBadgeIds.has(catalogItem.id);
              const earnedRecord = badges.find(b => b.badge_type === catalogItem.id);
              
              return (
                <div 
                  key={catalogItem.id}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    isEarned 
                      ? "bg-purple-50 border-purple-200 shadow-sm" 
                      : "bg-gray-50 border-gray-200 opacity-70 grayscale-[0.5]"
                  }`}
                >
                  {!isEarned && (
                    <div className="absolute top-2 right-2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  
                  <span className={`text-4xl mb-2 ${isEarned ? 'drop-shadow-md scale-110' : 'opacity-60'}`}>
                    {catalogItem.icon}
                  </span>
                  
                  <h4 className={`body-font font-bold text-center text-sm mb-1 ${isEarned ? 'text-purple-900' : 'text-gray-600'}`}>
                    {catalogItem.title}
                  </h4>
                  
                  <p className={`text-xs text-center leading-tight ${isEarned ? 'text-purple-700' : 'text-gray-500'}`}>
                    {catalogItem.description}
                  </p>
                  
                  {isEarned && earnedRecord && (
                    <div className="mt-2 text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      Earned {new Date(earnedRecord.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}