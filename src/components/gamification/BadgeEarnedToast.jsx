import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X } from 'lucide-react';

const BADGE_CATALOG = {
  first_chore: { title: "First Steps", icon: "👣", description: "Complete your first chore" },
  streak_3: { title: "On a Roll", icon: "🔥", description: "3-day chore streak" },
  streak_7: { title: "Week Warrior", icon: "💪", description: "7-day chore streak" },
  streak_14: { title: "Unstoppable", icon: "⚡", description: "14-day chore streak" },
  streak_30: { title: "Streak Master", icon: "🌋", description: "30-day chore streak" },
  chores_10: { title: "Getting Started", icon: "🧹", description: "Complete 10 chores" },
  chores_25: { title: "Chore Champ", icon: "🥈", description: "Complete 25 chores" },
  chores_50: { title: "Half Century", icon: "🥇", description: "Complete 50 chores" },
  chores_100: { title: "Centurion", icon: "💯", description: "Complete 100 chores" },
  category_master: { title: "Category Master", icon: "🎯", description: "Complete 10+ chores in one category" },
  level_up: { title: "Level Up!", icon: "⬆️", description: "Reach a new level" },
  points_100: { title: "Point Collector", icon: "💰", description: "Earn 100 total points" },
  points_500: { title: "Point Hoarder", icon: "💎", description: "Earn 500 total points" },
  points_1000: { title: "Point Legend", icon: "👑", description: "Earn 1000 total points" },
  perfect_week: { title: "Perfect Week", icon: "✨", description: "Complete all assigned chores in a week" }
};

export default function BadgeEarnedToast({ newBadges = [], levelChanged = false, newLevel = null, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState([]);

  useEffect(() => {
    const items = [];
    if (levelChanged) {
      items.push({
        type: 'level_up',
        title: "Level Up!",
        icon: "⬆️",
        description: `Reached Level ${newLevel || ''}`
      });
    }
    
    newBadges.forEach(badgeType => {
      if (BADGE_CATALOG[badgeType]) {
        items.push({
          type: badgeType,
          ...BADGE_CATALOG[badgeType]
        });
      }
    });
    
    setItemsToShow(items);
    setCurrentIndex(0);
  }, [newBadges, levelChanged, newLevel]);

  useEffect(() => {
    if (itemsToShow.length === 0) return;
    
    const timer = setTimeout(() => {
      if (currentIndex < itemsToShow.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [currentIndex, itemsToShow, onClose]);

  if (itemsToShow.length === 0) return null;

  const currentItem = itemsToShow[currentIndex];

  return (
    <AnimatePresence>
      <div className="fixed top-20 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
        <motion.div
          key={`${currentItem.type}-${currentIndex}`}
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="pointer-events-auto funky-card bg-white border-4 border-yellow-400 shadow-xl p-4 w-full max-w-[350px] relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-yellow-100 opacity-50"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-yellow-600 font-bold mb-2">
              <Award className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">
                {currentItem.type === 'level_up' ? 'Level Up!' : 'Badge Earned!'}
              </span>
            </div>
            
            <div className="text-6xl mb-3 drop-shadow-md animate-bounce">
              {currentItem.icon}
            </div>
            
            <h3 className="header-font text-2xl text-[#5E3B85] mb-1">
              {currentItem.title}
            </h3>
            
            <p className="body-font-light text-gray-600 text-sm">
              {currentItem.description}
            </p>

            {itemsToShow.length > 1 && (
              <div className="mt-4 flex gap-1.5">
                {itemsToShow.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}