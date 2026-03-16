import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/lib/navigation';
import { ChevronRight, Award, Flame, AlertCircle } from 'lucide-react';

const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, title: "Rookie", icon: "🌱" },
  { level: 2, minPoints: 100, title: "Helper", icon: "🧹" },
  { level: 3, minPoints: 300, title: "Pro", icon: "⭐" },
  { level: 4, minPoints: 600, title: "Star", icon: "🌟" },
  { level: 5, minPoints: 1000, title: "Champion", icon: "🏆" },
  { level: 6, minPoints: 2000, title: "Legend", icon: "👑" },
];

export default function FamilyOverview() {
  const { people = [], completions = [], family, getCurrentPerson } = useData();
  const myPerson = getCurrentPerson();
  const timezone = family?.timezone || "America/New_York";

  const overviewData = useMemo(() => {
    if (!myPerson || myPerson.role !== 'parent') return null;

    // Filter active members, optionally excluding the parent themselves
    // The prompt says "Parent's own card should be visually distinct or omitted". Let's omit it.
    const activeMembers = people.filter(p => 
      p.family_id === family?.id && 
      p.is_active !== false && 
      p.id !== myPerson.id
    );

    // Get pending reviews mapped by person_id
    const pendingReviews = completions.filter(c => c.completion_status === 'submitted');
    const pendingByPerson = pendingReviews.reduce((acc, curr) => {
      acc[curr.person_id] = (acc[curr.person_id] || 0) + 1;
      return acc;
    }, {});

    // Calculate streak status for each member
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });

    const getTzDateStr = (dateObj) => {
      const parts = formatter.formatToParts(dateObj);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    };

    const nowStr = getTzDateStr(new Date());
    const nowDateObj = new Date(nowStr);

    const membersWithStats = activeMembers.map(person => {
      const pendingCount = pendingByPerson[person.id] || 0;
      
      // Streak calculation
      let streakStatus = "broken";
      if (person.last_chore_completed_at) {
        const lastStr = getTzDateStr(new Date(person.last_chore_completed_at));
        const lastDateObj = new Date(lastStr);
        const diffTime = nowDateObj.getTime() - lastDateObj.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) streakStatus = "active";
        else if (diffDays === 1) streakStatus = "at_risk";
      }

      // Level icon
      const currentLevel = person.level || 1;
      const levelInfo = LEVEL_THRESHOLDS.find(t => t.level === currentLevel) || LEVEL_THRESHOLDS[0];

      return {
        ...person,
        pendingCount,
        streakStatus,
        levelIcon: levelInfo.icon
      };
    });

    // Sort: pending reviews first, then by name
    membersWithStats.sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (b.pendingCount > 0 && a.pendingCount === 0) return 1;
      return a.name.localeCompare(b.name);
    });

    return membersWithStats;
  }, [people, completions, family, myPerson, timezone]);

  if (!overviewData || overviewData.length === 0) return null;

  const getStreakColor = (status) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'at_risk') return 'bg-amber-500';
    return 'bg-gray-300';
  };

  const getAvatarColor = (color) => {
    const colors = {
      lavender: 'bg-[#C3B1E1]',
      mint: 'bg-[#98FF98]',
      blue: 'bg-[#AEC6CF]',
      peach: 'bg-[#FFDAB9]',
      pink: 'bg-[#F7A1C4]',
      coral: 'bg-[#F88379]',
      sage: 'bg-[#9DC183]',
      sky: 'bg-[#87CEEB]'
    };
    return colors[color] || colors.lavender;
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="header-font text-2xl text-[#5E3B85] flex items-center gap-2">
        <AlertCircle className="w-6 h-6 text-[#FF6B35]" />
        Family Overview
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overviewData.map(member => (
          <Link 
            key={member.id}
            to={createPageUrl('People')}
            className="funky-card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E3B85]"
          >
            {member.pendingCount > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm z-10">
                {member.pendingCount}
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full border-2 border-[#5E3B85] flex items-center justify-center text-xl shadow-sm ${getAvatarColor(member.avatar_color)}`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="body-font font-bold text-lg text-[#5E3B85] leading-tight">
                    {member.name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                    {member.role}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 body-font-light">
                  <div className="flex items-center gap-1" title={`Level ${member.level || 1}: ${member.level_title || 'Rookie'}`}>
                    <span>{member.levelIcon}</span>
                    <span className="font-bold">{member.level || 1}</span>
                  </div>
                  
                  <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                  
                  <div className="flex items-center gap-1" title={`${member.points_balance || 0} points available`}>
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-bold">{member.points_balance || 0}</span>
                  </div>
                  
                  <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                  
                  <div className="flex items-center gap-1" title={`Streak: ${member.current_streak || 0} days`}>
                    <Flame className={`w-3.5 h-3.5 ${member.streakStatus === 'broken' ? 'text-gray-400' : 'text-orange-500'}`} />
                    <span className="font-bold">{member.current_streak || 0}</span>
                    <div className={`w-2 h-2 rounded-full ml-0.5 ${getStreakColor(member.streakStatus)}`}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-gray-400">
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}