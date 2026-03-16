import React from "react";
import { AlertCircle } from "lucide-react";
import ChoreCard from "../chores/ChoreCard";
import SimpleChoreCard from "../chores/SimpleChoreCard";
import { isParent as checkParent, isChild } from '@/utils/roles';

export default function ChoresSection({ pendingAssignments = [], completedAssignments = [], chores = [], people = [], completeChore, user, isParent = true }) {
  const useSimplified = user?.simplified_view || (isChild(user) && user?.simplified_view !== false);
  const CardComponent = useSimplified ? SimpleChoreCard : ChoreCard;
  // Always show the section - even if empty, so users can see the "To Do" area
  const showEmptyState = pendingAssignments.length === 0 && completedAssignments.length === 0;

  const isAdmin = checkParent(user);

  return (
    <>
      {isParent && (pendingAssignments.length > 0 || completedAssignments.length > 0) && (
        <div className="funky-card p-4 bg-purple-50 border-2 border-purple-300 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="body-font text-sm text-purple-800">
              <strong>Parent Controls:</strong> Hover over any assignment to see reassignment options. 
              Need to make changes? Visit the <strong>Chores</strong> or <strong>Schedule</strong> page.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* Pending Chores Column - Always visible */}
        <div className="mx-1 pt-6 md:pt-8 pr-4 md:pr-5 pb-6 md:pb-8 pl-4 md:pl-5 funky-card max-h-[600px] md:max-h-[900px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="header-font text-2xl md:text-3xl text-[#2B59C3]">To Do</h2>
            <div className="funky-button bg-[#FF6B35] text-white px-3 md:px-4 py-1 md:py-2">
              <span className="body-font text-sm md:text-base">{pendingAssignments.length} remaining</span>
            </div>
          </div>
          {pendingAssignments.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {pendingAssignments.map((assignment) => {
                const chore = chores.find((c) => c.id === assignment.chore_id);
                const person = people.find((p) => p.id === assignment.person_id);

                if (!chore || !person) return null;

                return (
                  <CardComponent
                    key={assignment.id}
                    assignment={assignment}
                    chore={chore}
                    person={person}
                    onComplete={completeChore}
                    user={user}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="body-font-light text-gray-500">No chores assigned yet this week! 🎉</p>
            </div>
          )}
        </div>

      {/* Completed Chores Column */}
      {completedAssignments.length > 0 && (
        <div className="bg-green-50 mx-1 px-4 md:px-6 py-6 md:py-8 funky-card border-4 border-green-300 max-h-[600px] md:max-h-[900px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="header-font text-2xl md:text-3xl text-green-700">Completed!</h2>
            <div className="funky-button bg-green-500 text-white px-3 md:px-4 py-1 md:py-2">
              <span className="body-font text-sm md:text-base">{completedAssignments.length} done</span>
            </div>
          </div>
          <div className="grid gap-4 md:gap-6">
            {completedAssignments.map((assignment) => {
              const chore = chores.find((c) => c.id === assignment.chore_id);
              const person = people.find((p) => p.id === assignment.person_id);

              if (!chore || !person) return null;

              return (
                <CardComponent
                  key={assignment.id}
                  assignment={assignment}
                  chore={chore}
                  person={person}
                  onComplete={() => {}}
                  user={user}
                />
              );
            })}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
