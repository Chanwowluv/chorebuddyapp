import React, { useState } from "react";
import { Star, Clock } from "lucide-react";
import InteractiveCheckbox from "../ui/InteractiveCheckbox";
import ChoreCompletionModal from "./ChoreCompletionModal";
import { CHORE_CATEGORY_COLORS, DIFFICULTY_STARS, AVATAR_COLORS } from '../lib/constants';
import LearnedDifficultyBadge from './LearnedDifficultyBadge';

function ChoreCard({ assignment, chore, person, onComplete, user }) {
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  if (!chore || !person) return null;

  const handleCheckboxClick = () => {
    if (!assignment.completed) {
      setShowCompletionModal(true);
    }
  };

  const handleCompleteWithDetails = async (assignmentId, notes, photoUrl, difficultyRating) => {
    await onComplete(assignmentId, chore.id, notes, photoUrl, difficultyRating);
    setShowCompletionModal(false);
  };

  return (
    <>
      <div className={`funky-card-hover funky-card p-5 border-4 transition-all duration-200 ${chore.completed ? 'opacity-60 bg-gray-50' : 'bg-white'} ${CHORE_CATEGORY_COLORS[chore.category] || CHORE_CATEGORY_COLORS.general}`}>
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 mt-1">
            <InteractiveCheckbox
              id={`chore-${assignment.id}`}
              checked={assignment.completed}
              onCheckedChange={handleCheckboxClick}
              disabled={assignment.completed}
              aria-label={`Mark "${chore.title}" for ${person.name} as ${assignment.completed ? 'incomplete' : 'complete'}`}
            />
          </div>

        {/* Chore Details */}
        <div className="flex-1">
          <h3 className={`header-font text-xl text-[#2B59C3] ${assignment.completed ? 'line-through' : ''}`}>
            {chore.title}
          </h3>
          <p className="body-font-light text-gray-600 text-sm mb-3">
            {chore.description}
          </p>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center gap-1">
              {[...Array(DIFFICULTY_STARS[chore.difficulty])].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-500" />
              ))}
            </div>
            {chore.estimated_time && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="body-font text-xs">{chore.estimated_time} min</span>
              </div>
            )}
            <LearnedDifficultyBadge chore={chore} />
          </div>
        </div>

        {/* Person Avatar */}
        <div className="flex-shrink-0 text-center">
          <div className={`funky-button w-14 h-14 rounded-full border-3 flex items-center justify-center ${AVATAR_COLORS[person.avatar_color] || 'bg-gray-200'}`}>
            <span className="header-font text-xl text-white">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="body-font text-sm mt-1.5 text-[#5E3B85] font-semibold">{person.name}</p>
        </div>
      </div>
    </div>

    {showCompletionModal && (
      <ChoreCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onComplete={handleCompleteWithDetails}
        assignment={assignment}
        chore={chore}
        isPremium={user?.subscription_tier !== 'free'}
        requiresPhoto={chore?.photo_required}
      />
    )}
    </>
  );
}

export default React.memo(ChoreCard, (prev, next) => {
  return prev.assignment.id === next.assignment.id && 
         prev.assignment.completed === next.assignment.completed &&
         prev.chore.id === next.chore.id &&
         prev.person.id === next.person.id;
});