import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-4">
      <div className="funky-card max-w-lg w-full p-8 md:p-12 border-4 border-red-400 bg-white">
        <div className="mx-auto w-20 h-20 funky-button bg-red-500 flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3] mb-4">Payment Canceled</h1>
        
        <p className="body-font-light text-gray-600 text-lg mb-8">
          Your transaction was not completed. You can try again or choose a different plan.
        </p>

        <Link to={createPageUrl('Pricing')}>
          <Button className="funky-button bg-gray-500 hover:bg-gray-600 text-white py-4 header-font text-lg w-full">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Pricing
          </Button>
        </Link>
      </div>
    </div>
  );
}