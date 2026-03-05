import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Star, ShieldCheck, AlertCircle, Users, Building2 } from 'lucide-react';
import PlanCard from '../components/pricing/PlanCard';
import { stripeCheckout } from '@/functions/stripeCheckout';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 2 family members',
      'Up to 10 chores',
      'Up to 5 reward items',
      'Manual chore assignment',
      'Basic point tracking',
      'Basic rewards store'
    ],
    icon: Star,
    color: { border: 'border-gray-400', bg: 'bg-gray-200', icon: 'text-gray-600', button: 'bg-gray-500' }
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 15,
    yearlyPrice: 120,
    features: [
      '4 family members',
      'Unlimited chores & rewards',
      'ChoreAI smart assignments',
      'Recurring chores & rotations',
      'Photo verification',
      'Chore approval system',
      'Custom points & bonuses',
      'Family email invitations',
      'Priority task assignment',
      'Early completion bonus'
    ],
    icon: ShieldCheck,
    color: { border: 'border-[#C3B1E1]', bg: 'bg-[#C3B1E1]', icon: 'text-white', button: 'bg-[#C3B1E1]' },
    recommended: true
  },
  {
    id: 'family_plus',
    name: 'Family Plus',
    price: 25,
    yearlyPrice: 200,
    features: [
      '12 family members',
      'Everything in Premium',
      'Family goals & challenges',
      'Advanced analytics & reports',
      'Weekly email reports',
      'Multi-household support'
    ],
    icon: Users,
    color: { border: 'border-[#2B59C3]', bg: 'bg-[#2B59C3]', icon: 'text-white', button: 'bg-[#2B59C3]' }
  }
];

export default function Pricing() {
  const location = useLocation();
  const blockedFeature = location.state?.feature;
  const customMessage = location.state?.message;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("No authenticated user found", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSelectPlan = async (planId) => {
    if (!currentUser) {
      toast.info("Please sign up or log in to choose a plan.");
      base44.auth.redirectToLogin(createPageUrl("Pricing"));
      return;
    }

    if (planId === 'free') {
      // Handle downgrade logic or free plan selection directly
      setLoading(true);
      try {
        await base44.auth.updateMe({ subscription_tier: 'free' });
        const user = await base44.auth.me();
        setCurrentUser(user);
        toast.success("You are now on the Free plan.");
      } catch (error) {
        toast.error("Failed to change plan.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setIsRedirecting(true);
    try {
      const { data, error } = await stripeCheckout({
        endpoint: 'create-checkout-session',
        payload: { planId, isYearly: billingCycle === 'yearly' }
      });
      if (error) throw new Error(error);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Could not create checkout session.");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(error.message || "Could not connect to payment gateway.");
      setIsRedirecting(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 pb-32 lg:pb-8">
      {isRedirecting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="funky-card p-6 md:p-8 text-center bg-white mx-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1] mx-auto mb-4" />
            <p className="body-font text-base md:text-lg text-gray-600">Redirecting to secure payment...</p>
          </div>
        </div>
      )}

      {/* Premium Feature Alert */}
      {blockedFeature && (
        <div className="funky-card p-6 mb-8 border-4 border-[#FF6B35] bg-orange-50 mx-4 md:mx-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 funky-button bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="header-font text-xl text-[#FF6B35] mb-2">
                Upgrade Required
              </h3>
              <p className="body-font-light text-gray-700">
                {customMessage || 'The feature you tried to access requires a paid subscription. Upgrade now to unlock more features!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mt-8 md:mt-16 px-4 md:px-8">
        <h1 className="header-font text-4xl md:text-6xl text-[#2B59C3] leading-tight">
          {blockedFeature ? 'Upgrade Your Plan' : 'Find the Perfect Plan'}
        </h1>
        <p className="body-font-light text-lg md:text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
          Choose the plan that fits your family's needs and unlock powerful features to make chore management a breeze.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-8 flex justify-center items-center gap-4">
          <span className={`body-font text-lg ${billingCycle === 'monthly' ? 'text-[#5E3B85]' : 'text-gray-500'}`}>Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={billingCycle === 'yearly'}
              onChange={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            />
            <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:after:translate-x-1/2 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#FF6B35]"></div>
          </label>
          <span className={`body-font text-lg ${billingCycle === 'yearly' ? 'text-[#5E3B85]' : 'text-gray-500'}`}>
            Yearly <span className="text-sm text-green-600">(Save 20%)</span>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="mx-4 md:mx-8 lg:mx-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 items-stretch max-w-7xl mx-auto">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelectPlan={handleSelectPlan}
            isCurrentPlan={currentUser?.subscription_tier === plan.id}
            disabled={isRedirecting}
            billingCycle={billingCycle}
          />
        ))}
      </div>
    </div>
  );
}