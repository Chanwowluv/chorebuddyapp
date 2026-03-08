import React, { useState, useMemo } from 'react';
import { format, startOfWeek } from 'date-fns';
import { useChoreManagement } from '../hooks/useChoreManagement';
import { useData } from '../contexts/DataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, TrendingUp, Gift, Calendar } from 'lucide-react';
import ParentAnalytics from './ParentAnalytics';
import RewardTracker from './RewardTracker';
import DashboardHeader from './DashboardHeader';
import QuickActions from './QuickActions';
import DashboardSummary from './DashboardSummary';
import ChoresSection from './ChoresSection';
import DashboardEmptyState from './DashboardEmptyState';

export default function ParentDashboard({ assignChoresForWeek, isAssigning }) {
  const { people = [], chores = [], assignments = [], user, loading } = useData();
  const { completeChore } = useChoreManagement();
  const [activeTab, setActiveTab] = useState('overview');

  const currentWeekAssignments = useMemo(() => {
    const currentWeek = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    return assignments.filter((a) => a.week_start === currentWeek);
  }, [assignments]);

  const pendingAssignments = currentWeekAssignments.filter((a) => !a.completed);
  const completedAssignments = currentWeekAssignments.filter((a) => a.completed);

  const hasData = people.length > 0 || chores.length > 0;

  if (loading) {
    return (
      <div className="mx-24 pb-32 lg:pb-8">
        <div className="funky-card p-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>);

  }

  if (!hasData) {
    return (
      <div className="mx-5 pb-40 lg:pb-8">
        <DashboardHeader
          assignChoresForWeek={assignChoresForWeek}
          isAssigning={isAssigning} />

        <DashboardEmptyState
          currentWeekAssignments={assignments}
          people={people}
          chores={chores}
          user={user} />

      </div>);

  }

  return (
    <div className="mx-2 pb-32 lg:pb-8">
      <DashboardHeader
        assignChoresForWeek={assignChoresForWeek}
        isAssigning={isAssigning} />


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-neutral-50 text-slate-900 mb-6 p-2 rounded-lg items-center justify-center grid w-full grid-cols-4 funky-card h-auto">
          <TabsTrigger
            value="overview"
            className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-wrap rounded-sm transition-all data-[state=active]:bg-[#2B59C3] data-[state=active]:text-white">

            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="chores"
            className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-wrap rounded-sm transition-all data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white">

            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">This Week</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-wrap rounded-sm transition-all data-[state=active]:bg-[#C3B1E1] data-[state=active]:text-white">

            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="rewards"
            className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-wrap rounded-sm transition-all data-[state=active]:bg-[#F7A1C4] data-[state=active]:text-white">

            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Rewards</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <QuickActions />
          <DashboardSummary />
        </TabsContent>

        <TabsContent value="chores">
          <ChoresSection
            pendingAssignments={pendingAssignments}
            completedAssignments={completedAssignments}
            chores={chores}
            people={people}
            completeChore={completeChore}
            user={user}
            isParent={true} />

        </TabsContent>

        <TabsContent value="analytics">
          <ParentAnalytics />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardTracker />
        </TabsContent>
      </Tabs>
    </div>);

}