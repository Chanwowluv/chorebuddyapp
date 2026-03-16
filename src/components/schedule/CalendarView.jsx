import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { isParent as checkParent, isChild as checkChild } from '@/utils/roles';

export default function CalendarView({ 
  assignments, 
  chores, 
  people, 
  onCompleteChore,
  onDayClick,
  selectedDate,
  user
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const isParentMemo = checkParent(user);
  const isChildMemo = checkChild(user);
  const linkedPersonId = useMemo(() => user?.linked_person_id, [user?.linked_person_id]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map();
    
    // Pre-filter assignments by month range for better performance
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const relevantAssignments = assignments.filter(a => {
      const weekStart = new Date(a.week_start);
      const weekEnd = addDays(weekStart, 6);
      return weekEnd >= monthStart && weekStart <= monthEnd;
    });
    
    // Pre-parse dates once to avoid creating Date objects repeatedly
    const assignmentsWithDates = relevantAssignments.map(a => ({
      ...a,
      weekStart: new Date(a.week_start),
      weekEnd: addDays(new Date(a.week_start), 6),
      dueDate: a.due_date ? new Date(a.due_date) : null
    }));
    
    calendarDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      let filtered = assignmentsWithDates.filter(a => 
        day >= a.weekStart && day <= a.weekEnd
      );

      if (isChildMemo && linkedPersonId) {
        filtered = filtered.filter(a => a.person_id === linkedPersonId);
      }

      const dayAssignments = filtered.filter(a => {
        if (a.dueDate) {
          return isSameDay(a.dueDate, day);
        }
        const defaultDue = addDays(a.weekStart, 6);
        return isSameDay(defaultDue, day);
      });

      map.set(dayStr, dayAssignments);
    });
    
    return map;
  }, [calendarDays, assignments, isChildMemo, linkedPersonId, currentMonth]);

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="funky-card p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigateMonth('prev')}
            className="funky-button bg-white border-2 border-[#5E3B85] text-[#5E3B85] h-10 w-10 p-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="header-font text-xl md:text-2xl text-[#2B59C3] px-4">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            onClick={() => navigateMonth('next')}
            className="funky-button bg-white border-2 border-[#5E3B85] text-[#5E3B85] h-10 w-10 p-0"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <Button
          onClick={goToToday}
          className="funky-button bg-[#C3B1E1] text-white border-2 border-[#5E3B85] px-4 py-2"
        >
          Today
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center body-font text-sm text-[#5E3B85] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dayAssignments = assignmentsByDate.get(format(day, 'yyyy-MM-dd')) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const completedCount = dayAssignments.filter(a => a.completed).length;
          const pendingCount = dayAssignments.length - completedCount;

          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              onClick={() => onDayClick && onDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick && onDayClick(day);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${format(day, 'MMMM d, yyyy')}${isTodayDate ? ' (Today)' : ''}. ${dayAssignments.length} ${dayAssignments.length === 1 ? 'chore' : 'chores'}. ${completedCount} completed, ${pendingCount} pending.`}
              className={`
                min-h-[120px] sm:min-h-[100px] p-2 rounded-lg border-2 cursor-pointer transition-all
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-50'}
                ${isSelected ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]' : 'border-gray-200'}
                ${isTodayDate ? 'bg-yellow-50 border-yellow-400' : ''}
                hover:border-[#C3B1E1]
                focus:outline-none focus:ring-2 focus:ring-[#2B59C3] focus:ring-offset-2
              `}
            >
              {/* Date Number */}
              <div className={`
                header-font text-sm md:text-base mb-1
                ${isTodayDate ? 'text-[#FF6B35]' : isCurrentMonth ? 'text-[#5E3B85]' : 'text-gray-400'}
              `}>
                {format(day, 'd')}
              </div>

              {/* Assignment Indicators */}
              {dayAssignments.length > 0 && (
                <div className="space-y-1">
                  {/* Show up to 3 assignments */}
                  {dayAssignments.slice(0, 3).map((assignment, i) => {
                    const chore = chores.find(c => c.id === assignment.chore_id);
                    const person = people.find(p => p.id === assignment.person_id);
                    
                    return (
                      <div
                        key={assignment.id}
                        className={`
                          text-xs p-1 rounded truncate
                          ${assignment.completed 
                            ? 'bg-green-100 text-green-700 line-through' 
                            : 'bg-[#C3B1E1]/30 text-[#5E3B85]'
                          }
                        `}
                        title={`${chore?.title} - ${person?.name}`}
                      >
                        <span className="hidden md:inline">{chore?.title?.substring(0, 10)}{chore?.title?.length > 10 ? '...' : ''}</span>
                        <span className="md:hidden">{chore?.title?.charAt(0)}</span>
                      </div>
                    );
                  })}
                  
                  {/* More indicator */}
                  {dayAssignments.length > 3 && (
                    <div className="text-xs text-[#5E3B85] body-font">
                      +{dayAssignments.length - 3} more
                    </div>
                  )}

                  {/* Summary badges */}
                  <div className="flex gap-1 mt-1">
                    {completedCount > 0 && (
                      <div className="flex items-center gap-0.5 text-xs bg-green-100 text-green-700 px-1 rounded">
                        <CheckCircle className="w-3 h-3" />
                        <span>{completedCount}</span>
                      </div>
                    )}
                    {pendingCount > 0 && (
                      <div className="flex items-center gap-0.5 text-xs bg-orange-100 text-orange-700 px-1 rounded">
                        <Clock className="w-3 h-3" />
                        <span>{pendingCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
            <span className="body-font-light text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#C3B1E1]/30 border border-[#C3B1E1]"></div>
            <span className="body-font-light text-sm text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-400"></div>
            <span className="body-font-light text-sm text-gray-600">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}