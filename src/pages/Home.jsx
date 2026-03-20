import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Zap, Users, Gift } from 'lucide-react';
import FeatureCard from '../components/landing/FeatureCard';
import StepCard from '../components/landing/StepCard';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-[#FDFBF5] text-[#5E3B85]">
      <main className="container mx-auto px-6">
        {/* Hero Section */}
        <section className="py-20 sm:py-32 text-center">
            <h2 className="header-font text-5xl md:text-7xl text-[#2B59C3] max-w-4xl mx-auto">
              Tame the Chore Chaos, Unleash the Family Fun.
            </h2>
            <p className="body-font-light text-xl text-gray-700 mt-6 max-w-2xl mx-auto">
              ChoreBuddy turns household tasks into an engaging game. Motivate your family with smart assignments, fun rewards, and a little help from AI.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
              {isAuthenticated ? (
                <Link to={createPageUrl("Dashboard")}>
                  <Button
                    className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white header-font text-2xl px-12 py-8"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Button
                  className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white header-font text-2xl px-12 py-8"
                  onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                >
                  Get Started for Free
                </Button>
              )}
              <Link to={createPageUrl("Pricing")}>
                <Button variant="outline" className="funky-button bg-white hover:bg-gray-100 text-[#5E3B85] border-3 border-[#5E3B85] header-font text-2xl px-12 py-8">
                  View Plans
                </Button>
              </Link>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="text-center mb-12">
            <h3 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Why You'll Love ChoreBuddy</h3>
            <p className="body-font-light text-lg text-gray-600 mt-4">Everything you need for a harmonious home.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="ChoreAI™ Assignments"
              description="Our smart AI analyzes chores and fairness to assign tasks automatically. No more arguments about who does what!"
              color="bg-[#C3B1E1]"
            />
            <FeatureCard
              icon={Gift}
              title="Engaging Rewards"
              description="Family members earn points for completing chores, which they can redeem for custom rewards. Motivation, built-in."
              color="bg-yellow-400"
            />
            <FeatureCard
              icon={Users}
              title="Family-Focused"
              description="Designed for households of any size. Add parent, teens, and kids, and manage everyone's tasks from one place."
              color="bg-[#F7A1C4]"
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20">
          <div className="text-center mb-12">
            <h3 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Get Started in 3 Easy Steps</h3>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Set Up Your Family"
              description="Quickly add your family members. Assign roles like parent, teen, or child to tailor the experience."
              color="#F7A1C4"
            />
            <StepCard
              number="2"
              title="Create Your Chores"
              description="Build your library of household chores. Set difficulty, category, and estimated time for each task."
              color="#FF6B35"
            />
            <StepCard
              number="3"
              title="Enjoy the Magic"
              description="Let ChoreAI assign the week's tasks. Watch as your family completes chores and earns rewards, all on their own!"
              color="#C3B1E1"
            />
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20">
          <div className="funky-card bg-gradient-to-br from-[#FF6B35] to-[#f78e6a] p-12 text-center">
            <h3 className="header-font text-5xl text-white mb-4">Ready for a Cleaner Home?</h3>
            <p className="body-font-light text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of families who have transformed their chore routine. Sign up today and bring peace and productivity to your household.
            </p>
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button
                  className="funky-button bg-white hover:bg-gray-100 text-[#5E3B85] border-3 border-[#5E3B85] header-font text-2xl px-12 py-8"
                >
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                className="funky-button bg-white hover:bg-gray-100 text-[#5E3B85] border-3 border-[#5E3B85] header-font text-2xl px-12 py-8"
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
              >
                Get Started Now
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}