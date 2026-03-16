import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Zap, Star, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UpgradeModal({ isOpen, onClose, featureName, requiredPlan }) {
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
              <Zap className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="header-font text-4xl text-[#2B59C3] mb-4">Upgrade Your Plan!</h2>

            <p className="body-font-light text-gray-600 text-lg mb-2">
              The <span className="body-font text-[#FF6B35]">{featureName}</span> feature requires the{' '}
              <span className="body-font text-[#2B59C3]">{requiredPlan}</span> plan or higher.
            </p>
            <p className="body-font-light text-gray-600 text-lg mb-8">
              Upgrade your plan to take your chore management to the next level.
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