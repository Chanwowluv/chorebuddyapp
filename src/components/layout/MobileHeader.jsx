import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

// Root pages reachable directly from bottom navigation
const ROOT_PAGE_PATHS = [
  createPageUrl("Dashboard"),
  createPageUrl("People"),
  createPageUrl("Chores"),
  createPageUrl("Schedule"),
  createPageUrl("ChoreHistory"),
  createPageUrl("Messages"),
  createPageUrl("FamilyCalendar"),
  createPageUrl("NoticeBoard"),
  createPageUrl("Store"),
  createPageUrl("Goals"),
  createPageUrl("Admin"),
  "/",
];

export default function MobileHeader({
  currentPageName,
  isRootPage: isRootPageProp,
  canGoBack = false,
  fallbackPath = createPageUrl("Dashboard")
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const isRootPage = isRootPageProp ?? ROOT_PAGE_PATHS.includes(location.pathname);
  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath, { replace: true });
  };

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#FDFBF5]/95 backdrop-blur-sm border-b-3 border-[#5E3B85] pt-safe">
      <div className="flex items-center gap-3 px-4 py-3">
        {isRootPage ? (
          <>
            <div className="funky-button w-11 h-11 bg-[#C3B1E1] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl header-font text-[#2B59C3]">ChoreBuddy App</h1>
          </>
        ) : (
          <>
            <button
              onClick={handleBack}
              className="funky-button w-10 h-10 bg-[#C3B1E1] flex items-center justify-center select-none"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl header-font text-[#2B59C3]">{currentPageName}</h1>
          </>
        )}
      </div>
    </div>
  );
}
