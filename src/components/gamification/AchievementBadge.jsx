import React from 'react';
import { Award, Zap, Clock, Target, Star, Trophy, Crown, Flame, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const BADGE_CONFIG = {
  first_chore: { name: "First Steps", description: "Complete your first chore", icon: Target, color: 'from-green-400 to-emerald-500', glow: 'shadow-green-400/50' },
  streak_3: { name: "On a Roll", description: "3-day chore streak", icon: Flame, color: 'from-orange-400 to-red-500', glow: 'shadow-orange-400/50' },
  streak_7: { name: "Week Warrior", description: "7-day chore streak", icon: Flame, color: 'from-orange-400 to-red-500', glow: 'shadow-orange-400/50' },
  streak_14: { name: "Unstoppable", description: "14-day chore streak", icon: Crown, color: 'from-yellow-300 to-amber-500', glow: 'shadow-amber-400/50' },
  streak_30: { name: "Streak Master", description: "30-day chore streak", icon: Crown, color: 'from-yellow-300 to-amber-500', glow: 'shadow-amber-400/50' },
  chores_10: { name: "Getting Started", description: "Complete 10 chores", icon: Award, color: 'from-blue-400 to-indigo-500', glow: 'shadow-blue-400/50' },
  chores_25: { name: "Chore Champ", description: "Complete 25 chores", icon: Trophy, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-400/50' },
  chores_50: { name: "Half Century", description: "Complete 50 chores", icon: Trophy, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-400/50' },
  chores_100: { name: "Centurion", description: "Complete 100 chores", icon: Crown, color: 'from-yellow-400 to-amber-600', glow: 'shadow-yellow-400/50' },
  category_master: { name: "Category Master", description: "Complete 10+ chores in one category", icon: Award, color: 'from-red-400 to-orange-500', glow: 'shadow-red-400/50' },
  level_up: { name: "Level Up!", description: "Reach a new level", icon: Star, color: 'from-purple-400 to-pink-500', glow: 'shadow-purple-400/50' },
  points_100: { name: "Point Collector", description: "Earn 100 total points", icon: Zap, color: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-400/50' },
  points_500: { name: "Point Hoarder", description: "Earn 500 total points", icon: Zap, color: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-400/50' },
  points_1000: { name: "Point Legend", description: "Earn 1000 total points", icon: Crown, color: 'from-yellow-400 to-amber-600', glow: 'shadow-yellow-400/50' },
  perfect_week: { name: "Perfect Week", description: "Complete all assigned chores in a week", icon: Star, color: 'from-purple-400 to-pink-500', glow: 'shadow-purple-400/50' },
  early_bird: { name: "Early Bird", description: "Completed a chore before 8 AM", icon: Clock, color: 'from-yellow-400 to-orange-400', glow: 'shadow-yellow-400/50' },
  night_owl: { name: "Night Owl", description: "Completed a chore after 9 PM", icon: Zap, color: 'from-indigo-400 to-purple-500', glow: 'shadow-purple-400/50' },
  speed_demon: { name: "Speed Demon", description: "Completed a chore in under 10 minutes", icon: Zap, color: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-400/50' },
  weekend_warrior: { name: "Weekend Warrior", description: "Completed 5+ chores on a weekend", icon: Zap, color: 'from-green-400 to-teal-500', glow: 'shadow-green-400/50' },
  team_player: { name: "Team Player", description: "Helped with someone else's chore", icon: Heart, color: 'from-pink-400 to-rose-500', glow: 'shadow-pink-400/50' },
  perfectionist: { name: "Perfectionist", description: "Got 5 top-rated reviews in a row", icon: Star, color: 'from-purple-400 to-pink-500', glow: 'shadow-purple-400/50' },
  challenge_champion: { name: "Challenge Champion", description: "Won a family challenge", icon: Trophy, color: 'from-yellow-300 to-orange-400', glow: 'shadow-yellow-400/50' }
};

export default function AchievementBadge({ badgeType, size = 'md', showLabel = true, animate = false }) {
  const config = BADGE_CONFIG[badgeType];
  
  if (!config) return null;
  
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-xs' },
    md: { container: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-sm' },
    lg: { container: 'w-24 h-24', icon: 'w-12 h-12', text: 'text-base' },
    xl: { container: 'w-32 h-32', icon: 'w-16 h-16', text: 'text-lg' }
  };
  
  const sizes = sizeClasses[size];
  
  const BadgeContent = () => (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={`${sizes.container} rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg ${config.glow} border-4 border-white`}
      >
        <Icon className={`${sizes.icon} text-white`} />
      </div>
      {showLabel && (
        <div className="text-center">
          <p className={`body-font ${sizes.text} text-gray-800`}>{config.name}</p>
          <p className={`body-font-light text-xs text-gray-600`}>{config.description}</p>
        </div>
      )}
    </div>
  );
  
  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.2
        }}
      >
        <BadgeContent />
      </motion.div>
    );
  }
  
  return <BadgeContent />;
}

export { BADGE_CONFIG };