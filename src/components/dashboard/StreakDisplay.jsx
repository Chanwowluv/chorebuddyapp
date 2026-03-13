import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";

export default function StreakDisplay() {
  const { getCurrentPerson, family } = useData();
  const myPerson = getCurrentPerson();
  const timezone = family?.timezone || "America/New_York";

  const streakData = useMemo(() => {
    if (!myPerson) return null;

    const currentStreak = myPerson.current_streak || 0;
    const bestStreak = myPerson.best_streak || 0;
    const lastCompletedAt = myPerson.last_chore_completed_at;

    if (!lastCompletedAt) {
      return {
        status: "broken",
        displayStreak: 0,
        bestStreak,
        message: "Start a new streak today!",
        color: "text-gray-500",
        bg: "bg-gray-100",
        border: "border-gray-300"
      };
    }

    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });

    const getTzDateStr = (dateObj) => {
      const parts = formatter.formatToParts(dateObj);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    };

    const nowStr = getTzDateStr(new Date());
    const lastStr = getTzDateStr(new Date(lastCompletedAt));

    const nowDateObj = new Date(nowStr);
    const lastDateObj = new Date(lastStr);
    const diffTime = nowDateObj.getTime() - lastDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        status: "active",
        displayStreak: currentStreak,
        bestStreak,
        message: "Keep it up!",
        color: "text-green-500",
        bg: "bg-green-50",
        border: "border-green-500"
      };
    } else if (diffDays === 1) {
      return {
        status: "at_risk",
        displayStreak: currentStreak,
        bestStreak,
        message: "Complete a chore today to keep your streak!",
        color: "text-amber-500",
        bg: "bg-amber-50",
        border: "border-amber-500"
      };
    } else {
      return {
        status: "broken",
        displayStreak: 0,
        bestStreak,
        message: "Start a new streak today!",
        color: "text-gray-400",
        bg: "bg-gray-50",
        border: "border-gray-300"
      };
    }
  }, [myPerson, timezone]);

  if (!myPerson || !streakData) return null;

  return (
    <div className={`funky-card p-5 flex flex-col justify-center gap-2 w-full md:w-64 flex-shrink-0 ${streakData.bg} ${streakData.border}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="body-font text-sm text-gray-600 font-bold uppercase tracking-wider">
            Current Streak
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`header-font text-4xl ${streakData.color}`}>
              {streakData.displayStreak}
            </span>
            <span className={`text-3xl ${streakData.status === 'broken' ? 'grayscale opacity-50' : ''}`}>
              🔥
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs body-font-light text-gray-500">Best</p>
          <p className="text-sm body-font font-bold text-gray-700">{streakData.bestStreak} 🔥</p>
        </div>
      </div>
      
      <div className="mt-2">
        <p className={`text-xs body-font font-bold ${streakData.color}`}>
          {streakData.message}
        </p>
      </div>
    </div>
  );
}