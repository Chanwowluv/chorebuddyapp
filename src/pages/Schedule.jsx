import React, { useState, useMemo } from "react";
import { useData } from '../components/contexts/DataContext';
import { useChoreManagement } from '../components/hooks/useChoreManagement';
import { Calendar, CheckCircle, ArrowLeft, ArrowRight, Loader2, UserX, LayoutGrid, CalendarDays } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from 'framer-motion';
import ScheduleChoreItem from '../components/schedule/ScheduleChoreItem';
import CalendarView from '../components/schedule/CalendarView';
import DayDetailPanel from '../components/schedule/DayDetailPanel';
import Confetti from '../components/ui/Confetti';
import { AVATAR_COLORS } from '@/components/lib/constants';
import { toast } from "sonner";
import ReassignModal from '../components/chores/ReassignModal';
import { isParent as checkParent, isChild as checkChild } from '@/components/lib/roles';
import PullToRefresh from '../components/ui/PullToRefresh';

export default function Schedule() {
  const { assignments, chores, people, user, loading, updateAssignment, fetchData } = useData();
  const { completeChore, completedChoreIdWithConfetti } = useChoreManagement();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [isReassignModalOpen, setReassignModalOpen] = useState(false);
  const [assignmentToReassign, setAssignmentToReassign] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);

  const isParent = checkParent(user);
  const isChild = checkChild(user);

  const weekAssignments = useMemo(() => {
    const weekString = format(currentWeek, "yyyy-MM-dd");
    let filtered = assignments.filter((assignment) => assignment.week_start === weekString);
    
    // For children/teens, only show their own assignments
    if (isChild && user?.linked_person_id) {
      filtered = filtered.filter(a => a.person_id === user.linked_person_id);
    }
    
    return filtered;
  }, [assignments, currentWeek, isChild, user]);

  const navigateWeek = (direction) => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const handleShowReassign = (assignment) => {
    setAssignmentToReassign(assignment);
    setReassignModalOpen(true);
  };

  const handleReassign = async (assignmentId, newPersonId) => {
    setIsReassigning(true);
    try {
      await updateAssignment(assignmentId, { person_id: newPersonId });
      toast.success("Chore reassigned successfully!");
      setReassignModalOpen(false);
      setAssignmentToReassign(null);
      await fetchData();
    } catch (error) {
      console.error("Error reassigning chore:", error);
      toast.error("Failed to reassign chore. Please try again.");
    } finally {
      setIsReassigning(false);
    }
  };
  
  const reassignmentData = useMemo(() => {
    if (!assignmentToReassign) return null;
    return {
      assignment: assignmentToReassign,
      chore: chores.find(c => c.id === assignmentToReassign.chore_id),
      currentPerson: people.find(p => p.id === assignmentToReassign.person_id)
    };
  }, [assignmentToReassign, chores, people]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 md:w-12 md:h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  const isCurrentWeek = format(currentWeek, "yyyy-MM-dd") === format(startOfWeek(new Date()), "yyyy-MM-dd");

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 md:space-y-8 lg:pb-8 relative">
      {completedChoreIdWithConfetti && <Confetti />}
      
      <ReassignModal
        isOpen={isReassignModalOpen}
        onClose={() => {
          setReassignModalOpen(false);
          setAssignmentToReassign(null);
        }}
        onReassign={handleReassign}
        assignment={reassignmentData?.assignment}
        chore={reassignmentData?.chore}
        currentPerson={reassignmentData?.currentPerson}
        people={people}
        isProcessing={isReassigning}
      />
      
      {/* Header & View Toggle */}
      <div className="funky-card p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="funky-button w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-[#C3B1E1] flex items-center justify-center">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
            </div>
            <div>
              <p className="body-font text-base md:text-lg lg:text-xl text-[#FF6B35]">Interactive</p>
              <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3]">Chore Schedule</h1>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('week')}
              className={`funky-button px-4 py-2 ${
                viewMode === 'week' 
                  ? 'bg-[#2B59C3] text-white border-2 border-[#5E3B85]' 
                  : 'bg-white text-[#5E3B85] border-2 border-[#5E3B85]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Week
            </Button>
            <Button
              onClick={() => setViewMode('calendar')}
              className={`funky-button px-4 py-2 ${
                viewMode === 'calendar' 
                  ? 'bg-[#2B59C3] text-white border-2 border-[#5E3B85]' 
                  : 'bg-white text-[#5E3B85] border-2 border-[#5E3B85]'
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>
        
        {/* Week Navigation - only show in week view */}
        {viewMode === 'week' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="header-font text-lg md:text-xl lg:text-2xl text-[#2B59C3]">Week of {format(currentWeek, "MMM d, yyyy")}</h2>
              {isCurrentWeek && <div className="funky-button inline-block px-3 md:px-4 py-1 mt-2 bg-[#C3B1E1] text-white border-2 border-[#5E3B85]"><span className="body-font text-xs md:text-sm">Current Week</span></div>}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigateWeek('prev')} className="funky-button flex-1 bg-white text-[#5E3B85] border-3 border-[#5E3B85] px-4 md:px-6 py-3 header-font text-sm md:text-base lg:text-lg"><ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />Previous</Button>
              <Button onClick={() => navigateWeek('next')} className="funky-button flex-1 bg-white text-[#5E3B85] border-3 border-[#5E3B85] px-4 md:px-6 py-3 header-font text-sm md:text-base lg:text-lg">Next<ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarView
              assignments={assignments}
              chores={chores}
              people={people}
              onCompleteChore={completeChore}
              onDayClick={(day) => setSelectedDate(day)}
              selectedDate={selectedDate}
              user={user}
            />
          </div>
          <div>
            <DayDetailPanel
              selectedDate={selectedDate}
              assignments={assignments}
              chores={chores}
              people={people}
              onClose={() => setSelectedDate(null)}
              onCompleteChore={completeChore}
              user={user}
            />
          </div>
        </div>
      )}

      {/* Week View - Schedule Table */}
      {viewMode === 'week' && (
        <>
          {weekAssignments.length > 0 ? (
            <div className="space-y-8">
              {people.map((person) => {
                // For children/teens, only show their own person card
                if (isChild && user?.linked_person_id && person.id !== user.linked_person_id) {
                  return null;
                }
                
                const personAssignments = weekAssignments.filter((a) => a.person_id === person.id);
                if (personAssignments.length === 0) return null;
                const completedCount = personAssignments.filter((a) => a.completed).length;
                const totalCount = personAssignments.length;

                return (
                  <div key={person.id} className={`funky-card p-8 border-4 ${AVATAR_COLORS[person.avatar_color]}`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="funky-button w-16 h-16 rounded-full bg-white border-3 border-[#5E3B85] flex items-center justify-center"><span className="header-font text-2xl text-[#5E3B85]">{person.name.charAt(0).toUpperCase()}</span></div>
                        <div><h3 className="header-font text-3xl text-[#2B59C3]">{person.name}</h3><p className="body-font text-lg text-gray-600">{completedCount} of {totalCount} completed</p></div>
                      </div>
                      {completedCount === totalCount && totalCount > 0 && <div className="funky-button bg-[#C3B1E1] text-white px-6 py-3"><div className="flex items-center gap-2"><CheckCircle className="w-6 h-6" /><span className="header-font text-lg">All Done!</span></div></div>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {personAssignments.map((assignment) => {
                          const chore = chores.find((c) => c.id === assignment.chore_id);
                          return chore ? (
                            <div key={assignment.id} className="relative group">
                              <ScheduleChoreItem assignment={assignment} chore={chore} onComplete={completeChore} />
                              {isParent && !assignment.completed && (
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => handleShowReassign(assignment)}
                                 className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity funky-button bg-white/90 border-2 border-[#F7A1C4] text-pink-700 hover:bg-pink-50"
                                 title="Reassign to someone else"
                               >
                                 <UserX className="w-4 h-4" />
                               </Button>
                              )}
                            </div>
                          ) : null;
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="funky-card p-12 text-center border-4 border-dashed border-[#C3B1E1]">
              <Calendar className="w-24 h-24 mx-auto mb-6 text-[#C3B1E1]" />
              <h3 className="header-font text-3xl text-[#2B59C3] mb-4">No assignments for this week</h3>
              <p className="body-font-light text-gray-600 text-lg mb-6 max-w-md mx-auto">
                {isCurrentWeek ? "No chores have been assigned yet" : "No chores were assigned for this week"}
              </p>
              
              {isParent && isCurrentWeek && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-6 max-w-lg mx-auto">
                  <p className="body-font text-sm text-purple-800">
                    👑 <strong>Parent Tip:</strong> Go to the Dashboard and click "Assign Chores" to use ChoreAI, 
                    or visit the Chores page to manually assign tasks.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}