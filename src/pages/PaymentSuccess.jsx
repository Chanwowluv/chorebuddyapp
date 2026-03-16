import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { CheckCircle, Sparkles } from 'lucide-react';
import Confetti from '../components/ui/Confetti';

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-4 relative">
      <Confetti />
      <div className="funky-card max-w-lg w-full p-8 md:p-12 border-4 border-green-400 bg-white">
        <div className="mx-auto w-20 h-20 funky-button bg-green-500 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3] mb-4">Success!</h1>
        
        <p className="body-font-light text-gray-600 text-lg mb-8">
          Your subscription is now active! You can now enjoy all the premium features of ChoreBuddy.
        </p>

        <Link to={createPageUrl('Dashboard')}>
          <Button className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-4 header-font text-lg w-full">
            <Sparkles className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}