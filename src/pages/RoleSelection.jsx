import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Family } from '@/entities/Family';
import { Person } from '@/entities/Person';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Users, Baby, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { familyLinking } from '@/functions/familyLinking';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await User.me();
        
        // If user already has a family_role set, redirect to dashboard
        if (userData.family_role) {
          navigate(createPageUrl('Dashboard'));
          return;
        }
      } catch (error) {
        console.error("Error checking user:", error);
        // User not authenticated, redirect to home
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setSelecting(true);

    try {
      const userData = await User.me();
      
      // If parent, create a family, Person record, and set admin role
      if (role === 'parent') {
        const family = await Family.create({
          name: `${userData.full_name}'s Family`,
          owner_user_id: userData.id,
          members: [userData.id],
          member_count: 1,
          subscription_tier: 'free',
          subscription_status: 'active',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          currency: 'USD',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Auto-create a Person record for the parent so they are
        // immediately visible as a family member (no manual linking needed)
        await Person.create({
          name: userData.full_name || 'Parent',
          family_id: family.id,
          linked_user_id: userData.id,
          role: 'parent',
          is_active: true,
          points_balance: 0,
          total_points_earned: 0,
          chores_completed_count: 0,
          current_streak: 0,
          best_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Admin privileges are derived from family_role: 'parent'
        await User.updateMyUserData({
          family_id: family.id,
          family_role: role
        });

        // Auto-generate a linking code so parents always have one ready
        try {
          await familyLinking({ action: 'generate', familyId: family.id });
        } catch (e) {
          // Non-critical: family still created, code can be generated later
          console.error('Failed to auto-generate linking code:', e);
        }
      } else {
        // Teen/Child - just set role, they'll join family via linking code
        await User.updateMyUserData({
          family_role: role
        });
      }

      toast.success(`Welcome! You're set up as a ${role}.`);
      // Navigate to family linking page to generate/share code or enter code
      navigate(createPageUrl('FamilyLinking'));
    } catch (error) {
      console.error("Error setting up role:", error);
      toast.error("Failed to set up your account. Please try again.");
      setSelecting(false);
      setSelectedRole(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="funky-button w-20 h-20 bg-[#C3B1E1] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="header-font text-5xl md:text-6xl text-[#2B59C3] mb-4">
            Welcome to ChoreBuddy!
          </h1>
          <p className="body-font text-xl text-gray-600">
            Let's get you set up. Who are you in your family?
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Parent Card */}
          <button
            onClick={() => handleRoleSelect('parent')}
            disabled={selecting}
            className={`funky-card-hover funky-card p-8 text-center transition-all ${
              selectedRole === 'parent' ? 'scale-105 border-[#2B59C3] bg-blue-50' : ''
            } ${selecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="funky-button w-20 h-20 mx-auto mb-4 bg-[#2B59C3] flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="header-font text-3xl text-[#2B59C3] mb-3">Parent</h2>
            <p className="body-font-light text-gray-600 mb-4">
              Manage your family, assign chores, and approve completions
            </p>
            <div className="space-y-2 text-sm body-font-light text-left">
              <p className="text-gray-700">✓ Create & manage family</p>
              <p className="text-gray-700">✓ Assign chores to everyone</p>
              <p className="text-gray-700">✓ Approve completions</p>
              <p className="text-gray-700">✓ View family analytics</p>
            </div>
            {selecting && selectedRole === 'parent' && (
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#2B59C3]" />
              </div>
            )}
          </button>

          {/* Teen Card */}
          <button
            onClick={() => handleRoleSelect('teen')}
            disabled={selecting}
            className={`funky-card-hover funky-card p-8 text-center transition-all ${
              selectedRole === 'teen' ? 'scale-105 border-[#FF6B35] bg-orange-50' : ''
            } ${selecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="funky-button w-20 h-20 mx-auto mb-4 bg-[#FF6B35] flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="header-font text-3xl text-[#FF6B35] mb-3">Teen</h2>
            <p className="body-font-light text-gray-600 mb-4">
              Join your family, complete chores, and earn rewards
            </p>
            <div className="space-y-2 text-sm body-font-light text-left">
              <p className="text-gray-700">✓ Join existing family</p>
              <p className="text-gray-700">✓ View assigned chores</p>
              <p className="text-gray-700">✓ Mark chores complete</p>
              <p className="text-gray-700">✓ Track your progress</p>
            </div>
            {selecting && selectedRole === 'teen' && (
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
              </div>
            )}
          </button>

          {/* Child Card */}
          <button
            onClick={() => handleRoleSelect('child')}
            disabled={selecting}
            className={`funky-card-hover funky-card p-8 text-center transition-all ${
              selectedRole === 'child' ? 'scale-105 border-[#F7A1C4] bg-pink-50' : ''
            } ${selecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="funky-button w-20 h-20 mx-auto mb-4 bg-[#F7A1C4] flex items-center justify-center">
              <Baby className="w-10 h-10 text-pink-800" />
            </div>
            <h2 className="header-font text-3xl text-[#F7A1C4] mb-3">Child</h2>
            <p className="body-font-light text-gray-600 mb-4">
              Complete fun chores and earn awesome rewards!
            </p>
            <div className="space-y-2 text-sm body-font-light text-left">
              <p className="text-gray-700">✓ Join your family</p>
              <p className="text-gray-700">✓ See your chores</p>
              <p className="text-gray-700">✓ Complete tasks</p>
              <p className="text-gray-700">✓ Earn rewards!</p>
            </div>
            {selecting && selectedRole === 'child' && (
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#F7A1C4]" />
              </div>
            )}
          </button>
        </div>

        <p className="text-center body-font-light text-gray-500 mt-8">
          Choose carefully! Parents can manage roles later from account settings.
        </p>
      </div>
    </div>
  );
}