
import React from "react";
import { Check, X } from "lucide-react";

export default function WeeklyProgress({ assignments = [] }) {
  const weeklyAssignments = assignments; // Simplified for dashboard context
  const completed = weeklyAssignments.filter((a) => a.completed).length;
  const total = weeklyAssignments.length;
  const progress = total > 0 ? Math.round(completed / total * 100) : 0;
  const remaining = total - completed;

  return (
    <div className="funky-card p-6 space-y-6">
      <div>
        <h3 className="header-font text-2xl text-[#2B59C3]">Week's Stats</h3>
      </div>
      
      <div className="bg-violet-50 text-slate-50 rounded-full w-full h-6 border-2 border-[#5E3B85]">
        <div
          className="bg-[#C3B1E1] h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
          style={{ width: `${progress}%` }}>

          {progress > 10 &&
          <span className="header-font text-white text-sm">{progress}%</span>
          }
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="funky-card border-green-500 border-3 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Check className="w-6 h-6 text-green-500" />
            <span className="header-font text-3xl text-green-600">{completed}</span>
          </div>
          <p className="body-font-light text-sm">Completed</p>
        </div>
        <div className="funky-card border-red-500 border-3 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <X className="w-6 h-6 text-red-500" />
            <span className="header-font text-3xl text-red-600">{remaining}</span>
          </div>
          <p className="body-font-light text-sm">Remaining</p>
        </div>
      </div>
    </div>);
}