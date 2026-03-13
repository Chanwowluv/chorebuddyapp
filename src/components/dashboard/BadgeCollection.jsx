import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useData } from "../contexts/DataContext";
import { formatDistanceToNow } from "date-fns";
import { Lock, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
    if (!myPerson) return;
    
    const fetchBadges = async () => {
      try {
        setLoading(true);
        const fetchedBadges = await base44.entities.Badge.filter({ person_id: myPerson.id });
        fetchedBadges.sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
        // Limit to 50 badges for performance
        setBadges(fetchedBadges.slice(0, 50));
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [myPerson]);

  if (!myPerson) return null;

  const recentBadges = badges.slice(0, 4);
  const earnedBadgeTypes = new Set(badges.map(b => b.badge_type));

  return (
    <div className="funky-card p-5 md:p-6 bg-white w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          <h2 className="header-font text-xl text-[#5E3B85]">My Badges</h2>
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
            {myPerson.badges_count || badges.length} Earned
          </span>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <button className="text-sm body-font font-bold text-[#2B59C3] hover:text-[#24479c] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E3B85] rounded-md px-2 py-1">
              View All
            </button>
          </DialogTrigger>
          <DialogContent className="w-full h-[100dvh] sm:h-auto sm:w-auto sm:max-w-3xl sm:max-h-[80vh] overflow-y-auto funky-card border-0 sm:border-4 rounded-none sm:rounded-3xl p-6 m-0 sm:m-4">
            <DialogHeader>
              <DialogTitle className="header-font text-2xl text-[#5E3B85] flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Badge Catalog
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {BADGE_CATALOG.map((catalogItem) => {
                const isEarned = earnedBadgeTypes.has(catalogItem.id);
                const earnedInstance = badges.find(b => b.badge_type === catalogItem.id);
                
                return (
                  <div 
                    key={catalogItem.id} 
                    className={`relative p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                      isEarned 
                        ? "bg-yellow-50 border-yellow-300 shadow-sm" 
                        : "bg-gray-50 border-gray-200 opacity-70 grayscale-[0.5]"
                    }`}
                    aria-label={`${catalogItem.title}, ${isEarned ? 'Earned' : 'Locked'}. ${catalogItem.description}`}
                  >
                    {!isEarned && (
                      <div className="absolute top-2 right-2" title="Locked">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="sr-only">Locked</span>
                      </div>
                    )}
                    {isEarned && (
                      <div className="absolute top-2 right-2" title="Earned">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span className="sr-only">Earned</span>
                      </div>
                    )}
                    <div className="text-4xl mb-2" aria-hidden="true">{catalogItem.icon}</div>
                    <h4 className={`body-font font-bold text-sm ${isEarned ? 'text-yellow-900' : 'text-gray-600'}`}>
                      {catalogItem.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 body-font-light leading-tight">
                      {catalogItem.description}
                    </p>
                    {isEarned && earnedInstance && (
                      <p className="text-[10px] text-yellow-600 font-bold mt-2">
                        Earned {formatDistanceToNow(new Date(earnedInstance.earned_at))} ago
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin"></div>
        </div>
      ) : badges.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-2 opacity-50">🌟</div>
          <h3 className="body-font font-bold text-gray-600">No badges yet</h3>
          <p className="text-sm text-gray-500 mt-1">Complete chores to earn your first badge!</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {recentBadges.map((badge) => (
            <div 
              key={badge.id} 
              className="flex items-center gap-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 flex-1 min-w-[200px] max-w-[250px] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-yellow-100">
                {badge.badge_icon}
              </div>
              <div>
                <h4 className="body-font font-bold text-sm text-yellow-900 leading-tight">
                  {badge.badge_title}
                </h4>
                <p className="text-xs text-yellow-700 mt-0.5">
                  {formatDistanceToNow(new Date(badge.earned_at))} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}