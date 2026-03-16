import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActions() {
  return (
    <div className="funky-card p-6 md:p-8 mb-6 md:mb-8">
      <h3 className="header-font text-2xl md:text-3xl text-[#2B59C3] mb-4 md:mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <Link to={createPageUrl("Schedule")}>
          <Button className="funky-button w-full bg-[#C3B1E1] text-white py-4 md:py-5 header-font text-base md:text-lg">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            View Schedule
          </Button>
        </Link>
        <Link to={createPageUrl("Store")}>
          <Button className="funky-button w-full bg-yellow-400 text-yellow-800 py-4 md:py-5 header-font text-base md:text-lg">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            Rewards Store
          </Button>
        </Link>
      </div>
    </div>
  );
}