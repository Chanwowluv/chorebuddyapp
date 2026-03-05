import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Home, Users, ClipboardList, Calendar, Sparkles, Zap, Settings, Loader2, Target, CheckCircle, MessageCircle, Megaphone } from "lucide-react";
import PublicLayout from "./components/layout/PublicLayout";
import CookieBanner from './components/ui/CookieBanner';
import RealTimeBadge from './components/ui/RealTimeBadge';
import { DataProvider } from './components/contexts/DataContext';
import { ThemeProvider } from './components/contexts/ThemeContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import OnboardingTour from './components/onboarding/OnboardingTour';
import UserAvatar from './components/profile/UserAvatar';
import { isParent as checkParent } from '@/utils/roles';
import { PUBLIC_PAGES } from '@/constants/publicPages';
import MobileHeader from './components/layout/MobileHeader';

const navigationItems = [
{
  title: "Dashboard",
  url: createPageUrl("Dashboard"),
  icon: Home,
  color: "bg-[#2B59C3] text-white",
  hover: "hover:bg-[#24479c]",
  active: "bg-[#24479c]"
},
{
  title: "Family",
  url: createPageUrl("People"),
  icon: Users,
  color: "bg-[#F7A1C4] text-pink-800",
  hover: "hover:bg-[#f590b8]",
  active: "bg-[#f590b8]"
},
{
  title: "Chores",
  url: createPageUrl("Chores"),
  icon: ClipboardList,
  color: "bg-[#FF6B35] text-white",
  hover: "hover:bg-[#fa5a1f]",
  active: "bg-[#fa5a1f]"
},
{
  title: "Schedule",
  url: createPageUrl("Schedule"),
  icon: Calendar,
  color: "bg-[#C3B1E1] text-white",
  hover: "hover:bg-[#b19dcb]",
  active: "bg-[#b19dcb]"
},
{
  title: "History",
  url: createPageUrl("ChoreHistory"),
  icon: CheckCircle,
  color: "bg-green-500 text-white",
  hover: "hover:bg-green-600",
  active: "bg-green-600"
},
{
  title: "Messages",
  url: createPageUrl("Messages"),
  icon: MessageCircle,
  color: "bg-[#C3B1E1] text-white",
  hover: "hover:bg-[#b19dcb]",
  active: "bg-[#b19dcb]"
},
{
  title: "Calendar",
  url: createPageUrl("FamilyCalendar"),
  icon: Calendar,
  color: "bg-[#FF6B35] text-white",
  hover: "hover:bg-[#fa5a1f]",
  active: "bg-[#fa5a1f]"
},
{
  title: "Notices",
  url: createPageUrl("NoticeBoard"),
  icon: Megaphone,
  color: "bg-[#F7A1C4] text-pink-800",
  hover: "hover:bg-[#f590b8]",
  active: "bg-[#f590b8]"
},
{
  title: "Store",
  url: createPageUrl("Store"),
  icon: Sparkles,
  color: "bg-yellow-400 text-yellow-800",
  hover: "hover:bg-yellow-500",
  active: "bg-yellow-500"
},
{
  title: "Goals",
  url: createPageUrl("Goals"),
  icon: Target,
  color: "bg-green-400 text-green-800",
  hover: "hover:bg-green-500",
  active: "bg-green-500"
}];

// Parent/admin-only navigation items
const adminNavigationItems = [
{
  title: "Admin",
  url: createPageUrl("Admin"),
  icon: CheckCircle,
  color: "bg-[#5E3B85] text-white",
  hover: "hover:bg-[#4a2d6b]",
  active: "bg-[#4a2d6b]"
}];

function AppLayout({ children, currentPageName, showOnboarding, setShowOnboarding }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const onboardingShownRef = React.useRef(false);

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);

  useEffect(() => {
    // No need to run auth check for public pages
    if (isPublicPage) {
      setAuthChecked(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setIsAuthenticated(true);
        setCurrentUser(userData);

        // Check if user needs to complete role selection
        if (!userData.family_role && currentPageName !== 'RoleSelection') {
          navigate(createPageUrl('RoleSelection'));
          return;
        }

        // Show onboarding ONCE per session for new users (after role selection)
        if (
          userData.family_role && 
          !userData.data?.onboarding_completed && 
          currentPageName !== 'RoleSelection' &&
          !onboardingShownRef.current
        ) {
          setShowOnboarding(true);
          onboardingShownRef.current = true;
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
      };

    checkAuth();
  }, [currentPageName, navigate]);

  // Public pages render immediately with PublicLayout for unauthenticated visitors
  if (isPublicPage && !isAuthenticated) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  // For private pages, show a loader until the auth check is complete
  if (!authChecked || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFBF5]">
        <Loader2 className="w-16 h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  // Authenticated Layout
  return (
    <div className="min-h-screen bg-[#FDFBF5] text-[#5E3B85]">
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;800&display=swap');

          /* Theme-based dynamic styling */
          [data-theme="ocean"] .theme-primary { color: var(--color-primary, #2B59C3); }
          [data-theme="ocean"] .theme-primary-bg { background-color: var(--color-primary, #2B59C3); }
          [data-theme="sunset"] .theme-primary { color: var(--color-primary, #FF6B35); }
          [data-theme="sunset"] .theme-primary-bg { background-color: var(--color-primary, #FF6B35); }
          [data-theme="forest"] .theme-primary { color: var(--color-primary, #3A7D44); }
          [data-theme="forest"] .theme-primary-bg { background-color: var(--color-primary, #3A7D44); }
          [data-theme="lavender"] .theme-primary { color: var(--color-primary, #C3B1E1); }
          [data-theme="lavender"] .theme-primary-bg { background-color: var(--color-primary, #C3B1E1); }
          [data-theme="candy"] .theme-primary { color: var(--color-primary, #F7A1C4); }
          [data-theme="candy"] .theme-primary-bg { background-color: var(--color-primary, #F7A1C4); }
          
          .funky-card {
            background-color: white;
            border: 3px solid #5E3B85;
            box-shadow: 6px 6px 0px #5E3B85;
            border-radius: 24px;
            transition: all 0.2s ease-out;
          }

          .funky-card-hover:hover {
            transform: translate(2px, 2px);
            box-shadow: 4px 4px 0px #5E3B85;
          }

          .funky-button {
            border: 3px solid #5E3B85;
            box-shadow: 4px 4px 0px #5E3B85;
            border-radius: 16px;
            transition: all 0.2s ease-out;
          }

          .funky-button:hover {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px #5E3B85;
          }

          .funky-button:active {
            transform: translate(4px, 4px);
            box-shadow: 0px 0px 0px #5E3B85;
          }
          
          .header-font {
            font-family: 'Fredoka One', cursive;
            letter-spacing: -0.01em;
          }
          
          .body-font {
            font-family: 'Nunito', sans-serif;
            font-weight: 600;
          }

          .body-font-light {
             font-family: 'Nunito', sans-serif;
             font-weight: 400;
          }

          /* For hiding scrollbar in Webkit browsers (Chrome, Safari) */
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }

          /* For hiding scrollbar in Firefox */
          .scrollbar-hide {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */
          }
      `}</style>

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row p-4 lg:p-8 gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            {/* Logo & User */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4">
                <div className="funky-button w-16 h-16 bg-[#C3B1E1] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="header-font text-4xl no-underline uppercase">CHOREBUDDY APP</h1>
                </div>
              </div>
              {currentUser?.data?.avatar && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-lg">
                  <UserAvatar avatarId={currentUser.data.avatar} size="md" />
                  <div>
                    <p className="body-font text-sm text-[#5E3B85]">{currentUser.full_name}</p>
                    <p className="text-xs text-gray-500">{{ free: 'Free', premium: 'Premium', family_plus: 'Family Plus', enterprise: 'Enterprise' }[currentUser.subscription_tier] || 'Free'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="space-y-4">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`funky-button flex items-center gap-4 p-4 ${item.color} ${item.hover} ${isActive ? item.active : ''}`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xl header-font">{item.title}</span>
                  </Link>
                );
              })}
              {checkParent(currentUser) && adminNavigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`funky-button flex items-center gap-4 p-4 ${item.color} ${item.hover} ${isActive ? item.active : ''}`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xl header-font">{item.title}</span>
                  </Link>
                );
              })}
              <div className="pt-4 border-t-2 border-dashed border-gray-300 space-y-4">
                <Link
                  to={createPageUrl("Account")}
                  className={`funky-button flex items-center gap-4 p-4 bg-gray-200 text-gray-700 hover:bg-gray-300`}
                >
                  <Settings className="w-6 h-6" />
                  <span className="text-xl header-font">Settings</span>
                </Link>
                <Link
                  to={createPageUrl("Pricing")}
                  className={`funky-button flex items-center gap-4 p-4 bg-green-400 text-green-800 hover:bg-green-500`}
                >
                  <Zap className="w-6 h-6" />
                  <span className="text-xl header-font">Upgrade</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <MobileHeader currentPageName={currentPageName} />
          <div className="pt-16 lg:pt-0">
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-4 border-[#5E3B85] mt-16 lg:mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div className="mx-10 px-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="header-font text-2xl text-[#2B59C3]">ChoreBuddy App</h3>
              </div>
              <p className="body-font-light text-gray-600 text-sm">
                Making household chores fun and manageable for the whole family.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="body-font text-lg text-[#5E3B85]">Quick Links</h4>
              <div className="space-y-2 body-font-light text-sm">
                <Link to={createPageUrl("Account")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Account Settings
                </Link>
                <Link to={createPageUrl("Help")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Help & Support
                </Link>
                <Link to={createPageUrl("Pricing")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Pricing Plans
                </Link>
              </div>
            </div>

            {/* Legal & Privacy */}
            <div className="space-y-4">
              <h4 className="body-font text-lg text-[#5E3B85]">Legal & Privacy</h4>
              <div className="space-y-2 body-font-light text-sm">
                <Link to={createPageUrl("Privacy")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Privacy Policy
                </Link>
                <Link to={createPageUrl("Privacy")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Terms of Service
                </Link>
                <Link to={createPageUrl("Privacy")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t-2 border-dashed border-gray-300 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="body-font-light text-sm text-gray-600">
                © {new Date().getFullYear()} ChoreBuddy App. All rights reserved.
              </p>
              <div className="flex items-center gap-4 body-font-light text-sm text-gray-600">
                <span>Version 1.0.0</span>
                <span>•</span>
                <a href="mailto:support@chorebuddyapp.com" className="hover:text-[#2B59C3] transition-colors">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#FDFBF5]/80 backdrop-blur-sm border-t-3 border-[#5E3B85] overflow-hidden pb-safe">
        <div className="flex items-center justify-start gap-2 p-2 sm:p-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <button
                key={item.title}
                onClick={() => {
                  if (isActive) {
                    navigate(item.url, { replace: true });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    navigate(item.url);
                  }
                }}
                className={`flex flex-col items-center gap-1 transition-transform duration-200 flex-shrink-0 select-none ${isActive ? 'scale-105' : 'scale-95 opacity-80'}`}
              >
                <div className={`funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[10px] body-font text-[#5E3B85] leading-tight">{item.title}</span>
              </button>
            );
          })}
          {checkParent(currentUser) && adminNavigationItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <button
                key={item.title}
                onClick={() => {
                  if (isActive) {
                    navigate(item.url, { replace: true });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    navigate(item.url);
                  }
                }}
                className={`flex flex-col items-center gap-1 transition-transform duration-200 flex-shrink-0 select-none ${isActive ? 'scale-105' : 'scale-95 opacity-80'}`}
              >
                <div className={`funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[10px] body-font text-[#5E3B85] leading-tight">{item.title}</span>
              </button>
            );
          })}
          <button
            onClick={() => navigate(createPageUrl("Account"))}
            className={`flex flex-col items-center gap-1 transition-transform duration-200 scale-95 opacity-80 flex-shrink-0 select-none`}
          >
            <div className={`funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-gray-200 text-gray-700`}>
              <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[10px] body-font text-[#5E3B85] leading-tight">Settings</span>
          </button>
          <button
            onClick={() => navigate(createPageUrl("Pricing"))}
            className={`flex flex-col items-center gap-1 transition-transform duration-200 scale-95 opacity-80 flex-shrink-0 select-none`}
          >
            <div className={`funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-green-400 text-green-800`}>
              <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[10px] body-font text-[#5E3B85] leading-tight">Upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LayoutWrapper(props) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <AppLayout {...props} showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding} />
          <RealTimeBadge />
          <CookieBanner />
          <OnboardingTour
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
          />
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}