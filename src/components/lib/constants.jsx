import { Gamepad2, Film, IceCream, DollarSign, Gift, Star, Heart, Trophy, Sparkles, Zap, Coffee, Pizza } from 'lucide-react';

export const AVATAR_COLORS = {
  lavender: "border-[#9b7ec9] bg-purple-50",
  mint: "border-green-500 bg-green-50",
  blue: "border-[#2B59C3] bg-blue-50",
  peach: "border-[#FF6B35] bg-orange-50",
  pink: "border-[#e87ba8] bg-pink-50"
};

export const CHORE_CATEGORY_COLORS = {
  kitchen: "border-[#FF6B35] bg-orange-50",
  bathroom: "border-[#2B59C3] bg-blue-50",
  bedroom: "border-[#e87ba8] bg-pink-50",
  laundry: "border-[#C3B1E1] bg-purple-50",
  outdoor: "border-green-500 bg-green-50",
  pets: "border-[#F7A1C4] bg-pink-50",
  dishes: "border-[#2B59C3] bg-blue-50",
  vacuuming: "border-[#9b7ec9] bg-purple-50",
  organizing: "border-[#FF6B35] bg-orange-50",
  trash: "border-gray-500 bg-gray-50",
  cooking: "border-[#FF6B35] bg-orange-50",
  grocery: "border-green-500 bg-green-50",
  general: "border-gray-500 bg-gray-50"
};

export const VALID_CHORE_CATEGORIES = [
  "kitchen", "bathroom", "bedroom", "laundry", "outdoor", "pets", 
  "dishes", "vacuuming", "organizing", "trash", "cooking", "grocery", "general"
];

export const REWARD_CATEGORY_COLORS = {
  privileges: "border-blue-500 bg-blue-50",
  treats: "border-pink-500 bg-pink-50",
  activities: "border-green-500 bg-green-50",
  other: "border-purple-500 bg-purple-50"
};

export const DIFFICULTY_STARS = {
  easy: 1,
  medium: 2,
  hard: 3
};

// Subscription limits: see src/constants/subscriptionTiers.js

export const REWARD_ICONS = {
  Gamepad2, Film, IceCream, DollarSign, Gift, Star,
  Heart, Trophy, Sparkles, Zap, Coffee, Pizza
};

export const REWARD_ICON_NAMES = Object.keys(REWARD_ICONS);