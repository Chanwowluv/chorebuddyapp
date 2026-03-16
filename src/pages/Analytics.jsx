import React from 'react';
import { useData } from '../components/contexts/DataContext';
import { TrendingUp, Loader2 } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { isParent as checkParent } from '@/utils/roles';

export default function Analytics() {
  const { loading, user } = useData();

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
          <h2 className="header-font text-2xl text-gray-500">
            Analytics are only available for parents with admin permissions.
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-8 lg:pb-8">
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-green-500 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">
              Analytics Dashboard
            </h1>
            <p className="body-font-light text-gray-600 mt-2">
              Deep insights into your family's chore patterns
            </p>
          </div>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}