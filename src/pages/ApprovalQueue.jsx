import React, { useState, useMemo } from 'react';
import { useData } from '../components/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Camera, MessageSquare, Loader2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AVATAR_COLORS, DIFFICULTY_STARS } from '../components/lib/constants';
import { showNotification } from '../components/notifications/NotificationManager';
import { isParent as checkParent } from '@/utils/roles';
import { base44 } from '@/api/base44Client';
import BadgeEarnedToast from '../components/gamification/BadgeEarnedToast';

export default function ApprovalQueue() {
  const { assignments, chores, people, user, loading, updateAssignment, addReward, fetchData } = useData();
  const [processingId, setProcessingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [toastData, setToastData] = useState(null);

  const pendingApprovals = useMemo(() => {
    return assignments
      .filter(a => a.completed && (!a.approval_status || a.approval_status === 'pending'))
      .filter(a => {
        const chore = chores.find(c => c.id === a.chore_id);
        return chore?.requires_approval;
      })
      .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));
  }, [assignments, chores]);

  const handleApprove = async (assignment) => {
    setProcessingId(assignment.id);
    try {
      const chore = chores.find(c => c.id === assignment.chore_id);
      const pointMap = { easy: 10, medium: 20, hard: 30 };
      const basePoints = chore?.custom_points || pointMap[chore?.difficulty] || 15;
      const points = Math.round(basePoints * (assignment.bonus_multiplier || 1));

      // Call the serverless function
      const response = await base44.functions.invoke('approveChore', { assignment_id: assignment.id });
      const result = response.data || response;

      // Refresh data
      await fetchData();

      toast.success('Chore approved! Points awarded.');
      
      if (result.new_badges?.length > 0 || result.level_changed) {
        setToastData({
          newBadges: result.new_badges || [],
          levelChanged: result.level_changed || false,
          newLevel: result.new_level || null
        });
      }
      
      // Notify the person
      const person = people.find(p => p.id === assignment.person_id);
      showNotification('Chore Approved! ✓', {
        body: `${person?.name}'s chore was approved and earned ${points} points!`,
        tag: 'chore-approved'
      });
    } catch (error) {
      console.error('Error approving chore:', error);
      toast.error('Failed to approve chore. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (assignment) => {
    setProcessingId(assignment.id);
    try {
      await updateAssignment(assignment.id, {
        approval_status: 'rejected',
        approved_by: user.id,
        approved_date: new Date().toISOString(),
        completed: false,
        completed_date: null
      });

      toast.success('Chore rejected. User will need to redo it.');
    } catch (error) {
      console.error('Error rejecting chore:', error);
      toast.error('Failed to reject chore. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  const isAdmin = checkParent(user);
  if (!isAdmin) {
    return (
      <div className="mx-4 md:mx-8 lg:mx-24 pb-32 lg:pb-8">
        <div className="funky-card p-8 text-center">
          <h2 className="header-font text-2xl text-red-600 mb-4">Access Denied</h2>
          <p className="body-font-light text-gray-600">Only parents with admin permissions can access the approval queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-6 lg:pb-8">
      {toastData && (
        <BadgeEarnedToast 
          newBadges={toastData.newBadges}
          levelChanged={toastData.levelChanged}
          newLevel={toastData.newLevel}
          onClose={() => setToastData(null)}
        />
      )}
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-[#FF6B35] flex items-center justify-center">
            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Approval Queue</h1>
            <p className="body-font-light text-gray-600 mt-2">
              Review and approve completed chores
            </p>
          </div>
          <div className="funky-button bg-[#C3B1E1] text-white px-4 py-2">
            <span className="body-font text-lg">{pendingApprovals.length} pending</span>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length === 0 ? (
        <div className="funky-card p-12 text-center border-4 border-dashed border-green-300 bg-green-50">
          <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-500" />
          <h3 className="header-font text-3xl text-green-700 mb-4">All Caught Up!</h3>
          <p className="body-font-light text-lg text-green-600">
            No chores waiting for approval. Great job keeping up!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {pendingApprovals.map((assignment) => {
              const chore = chores.find(c => c.id === assignment.chore_id);
              const person = people.find(p => p.id === assignment.person_id);
              const isProcessing = processingId === assignment.id;

              if (!chore || !person) return null;

              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="funky-card p-6 md:p-8 bg-white"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Chore Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`funky-button w-16 h-16 rounded-full flex items-center justify-center ${AVATAR_COLORS[person.avatar_color] || 'bg-gray-200'}`}>
                          <span className="header-font text-2xl text-white">
                            {person.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-1">
                            {chore.title}
                          </h3>
                          <p className="body-font text-lg text-gray-700">
                            Completed by <strong>{person.name}</strong>
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              {[...Array(DIFFICULTY_STARS[chore.difficulty])].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                              ))}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span className="body-font text-sm">
                                {format(new Date(assignment.completed_date), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {assignment.notes && (
                        <div className="funky-card bg-blue-50 border-2 border-blue-200 p-4 mb-4">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="body-font text-sm text-blue-800 mb-1">Notes:</p>
                              <p className="body-font-light text-gray-700">{assignment.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Difficulty Rating */}
                      {assignment.difficulty_rating && (
                        <div className="funky-card bg-purple-50 border-2 border-purple-200 p-4 mb-4">
                          <p className="body-font text-sm text-purple-800">
                            Difficulty feedback: <span className="capitalize font-semibold">
                              {assignment.difficulty_rating.replace('_', ' ')}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Photo */}
                      {assignment.photo_url && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Camera className="w-5 h-5 text-[#FF6B35]" />
                            <p className="body-font text-sm text-gray-700">Photo verification:</p>
                          </div>
                          <img
                            src={assignment.photo_url}
                            alt="Chore completion proof"
                            onClick={() => setSelectedImage(assignment.photo_url)}
                            className="w-full max-w-md rounded-lg border-4 border-[#5E3B85] cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Points Badge */}
                      <div className="funky-button bg-yellow-400 text-yellow-800 px-4 py-2 inline-flex items-center gap-2">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="body-font text-lg">
                          {chore?.custom_points || ({ easy: 10, medium: 20, hard: 30 }[chore?.difficulty]) || 15} points
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="lg:w-64 flex flex-col gap-3">
                      <Button
                        onClick={() => handleApprove(assignment)}
                        disabled={isProcessing}
                        className="funky-button bg-green-500 text-white py-6 text-lg header-font hover:bg-green-600"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(assignment)}
                        disabled={isProcessing}
                        variant="outline"
                        className="funky-button bg-red-100 text-red-700 border-red-300 py-6 text-lg header-font hover:bg-red-200"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={selectedImage}
            alt="Full size preview"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}