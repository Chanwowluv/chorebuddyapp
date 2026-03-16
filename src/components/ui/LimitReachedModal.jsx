import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LimitReachedModal({ 
  isOpen, 
  onClose, 
  limitType, 
  currentCount, 
  maxCount, 
  requiredTier 
}) {
  const getLimitMessage = () => {
    if (maxCount === -1) return `You've reached your plan's limit.`;
    switch (limitType) {
      case 'max_family_members':
        return `You've reached the limit of ${maxCount} family members on your current plan.`;
      case 'max_redeemable_items':
        return `You've reached the limit of ${maxCount} reward items on your current plan.`;
      case 'max_chores':
        return `You've reached the limit of ${maxCount} chores on your current plan.`;
      default:
        return `You've reached your plan's limit.`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="funky-card max-w-lg w-full p-8 text-center border-4 border-[#FF6B35] bg-white"
          >
            <div className="mx-auto w-20 h-20 funky-button bg-[#FF6B35] flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="header-font text-4xl text-[#2B59C3] mb-4">Plan Limit Reached</h2>
            
            <p className="body-font-light text-gray-600 text-lg mb-2">
              {getLimitMessage()}
            </p>
            <p className="body-font text-base text-[#5E3B85] mb-8">
              Upgrade to {requiredTier} for more capacity and premium features!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onClose}
                className="funky-button bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-4 header-font text-lg"
              >
                Maybe Later
              </Button>
              <Link to={createPageUrl('Pricing')}>
                <Button className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-4 header-font text-lg w-full">
                  <Zap className="w-5 h-5 mr-2" />
                  View Plans
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}