import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Sparkles, AlertCircle } from "lucide-react";
import { isParent as checkParent } from '@/utils/roles';

export default function DashboardEmptyState({ currentWeekAssignments, people, chores, user }) {
  if (currentWeekAssignments?.length > 0) return null;

  const noPeople = !people || people.length === 0;
  const noChores = !chores || chores.length === 0;
  const isAdmin = checkParent(user);

  // Complete Empty State - No People AND No Chores
  if (noPeople && noChores) {
    return (
      <div className="funky-card p-8 md:p-12 text-center border-4 border-dashed border-[#C3B1E1]">
        <Sparkles className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 text-[#C3B1E1]" />
        <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4">Welcome to ChoreBuddy!</h3>
        <p className="body-font-light text-base md:text-lg mb-6 max-w-md mx-auto">
          Let's get started by setting up your household
        </p>
        
        {isAdmin && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-6 max-w-lg mx-auto">
            <p className="body-font text-sm text-purple-800 text-left">
              👑 <strong>Admin Quick Start:</strong>
              <br />
              1️⃣ Add family members first
              <br />
              2️⃣ Create your chore library
              <br />
              3️⃣ Use ChoreAI or manually assign chores
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={createPageUrl("People")}>
            <Button className="funky-button bg-[#F7A1C4] text-white px-6 md:px-8 py-3 md:py-4 header-font text-base md:text-lg">
              <Users className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Step 1: Add Family
            </Button>
          </Link>
          <Link to={createPageUrl("Chores")}>
            <Button className="funky-button bg-[#FF6B35] text-white px-6 md:px-8 py-3 md:py-4 header-font text-base md:text-lg">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Step 2: Create Chores
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Missing People
  if (noPeople) {
    return (
      <div className="funky-card p-8 md:p-12 text-center border-4 border-dashed border-[#F7A1C4]">
        <Users className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 text-[#F7A1C4]" />
        <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4">Add family members first</h3>
        <p className="body-font-light text-base md:text-lg mb-8 max-w-md mx-auto">
          You need to add people to your household before assigning chores
        </p>
        <Link to={createPageUrl("People")}>
          <Button className="funky-button bg-[#F7A1C4] text-white px-6 md:px-8 py-3 md:py-4 header-font text-base md:text-lg">
            <Users className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            Add Family Members
          </Button>
        </Link>
      </div>
    );
  }

  // Missing Chores
  if (noChores) {
    return (
      <div className="funky-card p-8 md:p-12 text-center border-4 border-dashed border-[#FF6B35]">
        <ClipboardList className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 text-[#FF6B35]" />
        <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4">Create some chores first</h3>
        <p className="body-font-light text-base md:text-lg mb-8 max-w-md mx-auto">
          You need to add chores to your library before you can assign them
        </p>
        <Link to={createPageUrl("Chores")}>
          <Button className="funky-button bg-[#FF6B35] text-white px-6 md:px-8 py-3 md:py-4 header-font text-base md:text-lg">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            Create Chores
          </Button>
        </Link>
      </div>
    );
  }

  // Have people and chores but no assignments
  return (
    <div className="funky-card p-8 md:p-12 text-center border-4 border-dashed border-[#FF6B35]">
      <ClipboardList className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 text-[#FF6B35]" />
      <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4">No chores assigned yet</h3>
      <p className="body-font-light text-base md:text-lg mb-6 max-w-md mx-auto">
        Ready to assign this week's chores?
      </p>
      
      {isAdmin ? (
        <>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6 max-w-lg mx-auto">
            <div className="flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="body-font text-sm text-blue-800">
                <strong>How to assign chores:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Click <strong>"Assign Chores"</strong> above to use ChoreAI (automatic)</li>
                  <li>Or go to <strong>Chores</strong> page and use <strong>"Bulk Assign"</strong></li>
                  <li>Or hover over any chore to <strong>assign individually</strong></li>
                </ul>
              </div>
            </div>
          </div>
          <Link to={createPageUrl("Chores")}>
            <Button className="funky-button bg-[#FF6B35] text-white px-6 md:px-8 py-3 md:py-4 header-font text-base md:text-lg">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Go to Chores Page
            </Button>
          </Link>
        </>
      ) : (
        <p className="body-font-light text-sm text-gray-600">
          Ask your household admin to assign chores for this week.
        </p>
      )}
    </div>
  );
}