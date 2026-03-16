import React, { useState } from 'react';
import { format, isSameDay, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVATAR_COLORS, DIFFICULTY_STARS } from '@/components/lib/constants';
import { sanitizeHTML } from '@/components/lib/sanitization';

export default function DayDetailPanel({
  selectedDate,
  assignments,
  chores,
  people,
  onClose,
  onCompleteChore,
  user
}) {
  const [completingId, setCompletingId] = useState(null);
  const isParent = checkParent(user);
  const isChild = checkChild(user);

  const getAssignmentsForDate = (date) => {
    let filtered = assignments.filter(a => {
      const weekStart = new Date(a.week_start);
      const weekEnd = addDays(weekStart, 6);
      if (date < weekStart || date > weekEnd) return false;
      
      if (a.due_date) {
        return isSameDay(new Date(a.due_date), date);
      }
      const defaultDue = addDays(weekStart, 6);
      return isSameDay(defaultDue, date);
    });

    if (isChild && user?.linked_person_id) {
      filtered = filtered.filter(a => a.person_id === user.linked_person_id);
    }

    return filtered;
  };

  const dayAssignments = selectedDate ? getAssignmentsForDate(selectedDate) : [];

  if (!selectedDate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="funky-card p-6 border-4 border-[#2B59C3]"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="header-font text-2xl text-[#2B59C3]">
              {format(selectedDate, 'EEEE')}
            </h3>
            <p className="body-font text-lg text-gray-600">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {dayAssignments.length > 0 ? (
          <div className="space-y-4">
            {dayAssignments.map((assignment) => {
              const chore = chores.find(c => c.id === assignment.chore_id);
              const person = people.find(p => p.id === assignment.person_id);

              if (!chore) return null;

              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    funky-card p-4 border-3
                    ${assignment.completed 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-white border-[#5E3B85]'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`
                          header-font text-lg
                          ${assignment.completed ? 'text-green-700 line-through' : 'text-[#2B59C3]'}
                        `}>
                          {chore.title}
                        </h4>
                        {assignment.completed && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>

                      {/* Assigned Person */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#5E3B85]
                          ${AVATAR_COLORS[person?.avatar_color] || 'bg-gray-100'}
                        `}>
                          <span className="header-font text-sm text-[#5E3B85]">
                            {person?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="body-font text-sm text-gray-700">{person?.name}</span>
                      </div>

                      {/* Chore Details */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(DIFFICULTY_STARS[chore.difficulty] || 2)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                          ))}
                        </div>
                        {chore.estimated_time && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="body-font-light text-sm">{chore.estimated_time} min</span>
                          </div>
                        )}
                        {assignment.is_shared && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Shared task
                          </span>
                        )}
                        {assignment.is_rotation && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Rotation
                          </span>
                        )}
                      </div>

                      {chore.description && (
                        <p 
                          className="body-font-light text-sm text-gray-600 mt-2"
                          dangerouslySetInnerHTML={{ __html: sanitizeHTML(chore.description) }}
                        />
                      )}
                    </div>

                    {/* Complete Button */}
                    {!assignment.completed && (
                      <Button
                        onClick={async () => {
                          setCompletingId(assignment.id);
                          try {
                            await onCompleteChore(assignment);
                          } finally {
                            setCompletingId(null);
                          }
                        }}
                        disabled={completingId === assignment.id}
                        className="funky-button bg-[#C3B1E1] hover:bg-[#b19dcb] text-white px-4 py-2"
                      >
                        {completingId === assignment.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Done
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Done
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="funky-button w-16 h-16 mx-auto mb-4 bg-gray-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="body-font text-lg text-gray-500">No chores due on this day</p>
            <p className="body-font-light text-sm text-gray-400 mt-1">
              Enjoy your free time! 🎉
            </p>
          </div>
        )}

        {/* Summary */}
        {dayAssignments.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
            <div className="flex justify-between body-font text-sm">
              <span className="text-gray-600">Total chores:</span>
              <span className="text-[#5E3B85]">{dayAssignments.length}</span>
            </div>
            <div className="flex justify-between body-font text-sm mt-1">
              <span className="text-gray-600">Completed:</span>
              <span className="text-green-600">{dayAssignments.filter(a => a.completed).length}</span>
            </div>
            <div className="flex justify-between body-font text-sm mt-1">
              <span className="text-gray-600">Pending:</span>
              <span className="text-orange-600">{dayAssignments.filter(a => !a.completed).length}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}