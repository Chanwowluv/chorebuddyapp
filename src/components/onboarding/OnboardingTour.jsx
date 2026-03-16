import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to ChoreBuddy! 🎉',
    description: "Your dashboard is the home base for managing family chores. Here's everything you need to get started!",
    targetPage: 'Dashboard',
    highlight: null,
    action: null
  },
  {
    id: 'add-family',
    title: 'Add Your Family Members',
    description: 'Start by adding everyone in your household using the Family tab in the sidebar. You can parents, teens, and children.',
    targetPage: 'Dashboard',
    highlight: null,
    action: null
  },
  {
    id: 'create-chores',
    title: 'Create Chores',
    description: 'Next, add chores using the Chores tab. Set difficulty, category, and frequency for each task.',
    targetPage: 'Dashboard',
    highlight: null,
    action: null
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎊',
    description: 'Navigate using the sidebar to explore all features. Have fun making chores fair and rewarding!',
    targetPage: 'Dashboard',
    highlight: null,
    action: null
  }
];

export default function OnboardingTour({ isOpen, onClose, startAtStep = 0 }) {
  const [currentStep, setCurrentStep] = useState(startAtStep);
  const navigate = useNavigate();
  const abortControllerRef = React.useRef(null);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      abortControllerRef.current = new AbortController();
      await base44.auth.updateMe({ onboarding_completed: true });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error completing onboarding:', error);
      }
    } finally {
      onClose();
    }
  };

  const handleSkip = async () => {
    try {
      abortControllerRef.current = new AbortController();
      await base44.auth.updateMe({ onboarding_completed: true });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error skipping onboarding:', error);
      }
    } finally {
      onClose();
    }
  };

  const handleAction = () => {
    if (step.action) {
      navigate(createPageUrl(step.action.page));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="funky-card max-w-lg w-full p-6 sm:p-8 bg-white relative"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 funky-button w-10 h-10 bg-gray-200 flex items-center justify-center hover:bg-gray-300"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="funky-button w-20 h-20 bg-gradient-to-br from-[#C3B1E1] to-[#F7A1C4] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="header-font text-3xl sm:text-4xl text-[#2B59C3] mb-4">
              {step.title}
            </h2>
            <p className="body-font-light text-base sm:text-lg text-gray-700 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-[#FF6B35]'
                    : index < currentStep
                    ? 'w-2 bg-[#C3B1E1]'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Action button (if step has one) */}
          {step.action && (
            <Button
              onClick={handleAction}
              className="funky-button w-full bg-[#C3B1E1] text-white mb-4 py-6 text-lg header-font"
            >
              {step.action.label}
            </Button>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrev}
              disabled={isFirstStep}
              variant="outline"
              className="flex-1 funky-button bg-gray-200 py-6 text-lg body-font disabled:opacity-40"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 funky-button bg-[#FF6B35] text-white py-6 text-lg body-font"
            >
              {isLastStep ? "Let's Go!" : 'Next'}
              {!isLastStep && <ChevronRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="w-full text-center mt-4 body-font-light text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}