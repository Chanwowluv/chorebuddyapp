import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";

const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, title: "Rookie", icon: "🌱", color: "from-green-400", toColor: "to-blue-400" },
  { level: 2, minPoints: 100, title: "Helper", icon: "🧹", color: "from-blue-400", toColor: "to-purple-400" },
  { level: 3, minPoints: 300, title: "Pro", icon: "⭐", color: "from-purple-400", toColor: "to-yellow-400" },
  { level: 4, minPoints: 600, title: "Star", icon: "🌟", color: "from-yellow-400", toColor: "to-orange-400" },
  { level: 5, minPoints: 1000, title: "Champion", icon: "🏆", color: "from-orange-400", toColor: "to-red-400" },
  { level: 6, minPoints: 2000, title: "Legend", icon: "👑", color: "from-red-400", toColor: "to-red-500" },
];

export default function LevelProgressCard() {
  const { getCurrentPerson } = useData();
  const myPerson = getCurrentPerson();

  const progressData = useMemo(() => {
    if (!myPerson) return null;
    
    const totalPoints = myPerson.total_points_earned || 0;
    const currentLevel = myPerson.level || 1;
    
    const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel) || LEVEL_THRESHOLDS[0];
    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);

    if (!nextThreshold) {
      return {
        isMax: true,
        percentage: 100,
        text: "Max Level Reached!",
        currentThreshold
      };
    }

    const pointsIntoLevel = totalPoints - currentThreshold.minPoints;
    const pointsRequiredForNext = nextThreshold.minPoints - currentThreshold.minPoints;
    const percentage = Math.min(100, Math.max(0, (pointsIntoLevel / pointsRequiredForNext) * 100));

    return {
      isMax: false,
      percentage,
      pointsIntoLevel,
      pointsRequiredForNext,
      text: `${pointsIntoLevel} / ${pointsRequiredForNext} points to next level`,
      currentThreshold
    };
  }, [myPerson]);

  if (!myPerson || !progressData) return null;

  return (
    <div className="funky-card p-5 bg-white flex flex-col justify-center gap-3 w-full flex-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="text-4xl bg-gray-100 w-14 h-14 rounded-full flex items-center justify-center border-2 border-[#5E3B85]">
            {progressData.currentThreshold.icon}
          </div>
          <div>
            <h3 className="header-font text-xl text-[#2B59C3]">
              Level {myPerson.level || 1} — {myPerson.level_title || "Rookie"}
            </h3>
            <p className="body-font-light text-sm text-gray-500 font-bold">
              Total XP: {myPerson.total_points_earned || 0}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-1 mt-1">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden border-2 border-[#5E3B85]">
          <div 
            className="bg-green-400 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressData.percentage}%` }}
          />
        </div>
        <p className="text-xs body-font text-right text-gray-600 font-bold">
          {progressData.text}
        </p>
      </div>
    </div>
  );
}