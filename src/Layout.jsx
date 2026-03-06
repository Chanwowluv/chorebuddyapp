import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Home, Users, ClipboardList, Calendar, Sparkles, Zap,
  Settings, Loader2, Target, CheckCircle, MessageCircle,
  Megaphone, MoreHorizontal,
} from "lucide-react";
import PublicLayout from "./components/layout/PublicLayout";
import CookieBanner from "./components/ui/CookieBanner";
import RealTimeBadge from "./components/ui/RealTimeBadge";
import { DataProvider } from "./components/contexts/DataContext";
import { ThemeProvider } from "./components/contexts/ThemeContext";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import OnboardingTour from "./components/onboarding/OnboardingTour";
import UserAvatar from "./components/profile/UserAvatar";
import { isParent as checkParent } from "@/utils/roles";
import { PUBLIC_PAGES } from "@/constants/publicPages";
import MobileHeader from "./components/layout/MobileHeader";
import "./globals.css";

// ─── Navigation config with role visibility ─────────────────────────────────

const ALL_ROLES = ["parent", "teen", "child"];

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
    color: "bg-[#2B59C3] text-white",
    hover: "hover:bg-[#24479c]",
    active: "bg-[#24479c]",
    visibleTo: ALL_ROLES,
    mobileOrder: 1,
  },
  {
    title: "Family",
    url: createPageUrl("People"),
    icon: Users,
    color: "bg-[#F7A1C4] text-pink-800",
    hover: "hover:bg-[#f590b8]",
    active: "bg-[#f590b8]",
    visibleTo: ["parent"],
    mobileOrder: null, // hidden from mobile primary nav
  },
  {
    title: "Chores",
    url: createPageUrl("Chores"),
    icon: ClipboardList,
    color: "bg-[#FF6B35] text-white",
    hover: "hover:bg-[#fa5a1f]",
    active: "bg-[#fa5a1f]",
    visibleTo: ALL_ROLES,
    mobileOrder: 2,
  },
  {
    title: "Schedule",
    url: createPageUrl("Schedule"),
    icon: Calendar,
    color: "bg-[#C3B1E1] text-white",
    hover: "hover:bg-[#b19dcb]",
    active: "bg-[#b19dcb]",
    visibleTo: ALL_ROLES,
    mobileOrder: 3,
  },
  {
    title: "History",
    url: createPageUrl("ChoreHistory"),
    icon: CheckCircle,
    color: "bg-green-500 text-white",
    hover: "hover:bg-green-600",
    active: "bg-green-600",
    visibleTo: ALL_ROLES,
    mobileOrder: null,
  },
  {
    title: "Messages",
    url: createPageUrl("Messages"),
    icon: MessageCircle,
    color: "bg-[#C3B1E1] text-white",
    hover: "hover:bg-[#b19dcb]",
    active: "bg-[#b19dcb]",
    visibleTo: ALL_ROLES,
    mobileOrder: null,
  },
  {
    title: "Calendar",
    url: createPageUrl("FamilyCalendar"),
    icon: Calendar,
    color: "bg-[#FF6B35] text-white",
    hover: "hover:bg-[#fa5a1f]",
    active: "bg-[#fa5a1f]",
    visibleTo: ALL_ROLES,
    mobileOrder: null,
  },
  {
    title: "Notices",
    url: createPageUrl("NoticeBoard"),
    icon: Megaphone,
    color: "bg-[#F7A1C4] text-pink-800",
    hover: "hover:bg-[#f590b8]",
    active: "bg-[#f590b8]",
    visibleTo: ALL_ROLES,
    mobileOrder: null,
  },
  {
    title: "Store",
    url: createPageUrl("Store"),
    icon: Sparkles,
    color: "bg-yellow-400 text-yellow-800",
    hover: "hover:bg-yellow-500",
    active: "bg-yellow-500",
    visibleTo: ALL_ROLES,
    mobileOrder: 4,
  },
  {
    title: "Goals",
    url: createPageUrl("Goals"),
    icon: Target,
    color: "bg-green-400 text-green-800",
    hover: "hover:bg-green-500",
    active: "bg-green-500",
    visibleTo: ALL_ROLES,
    mobileOrder: null,
  },
];

const adminNavigationItems = [
  {
    title: "Admin",
    url: createPageUrl("Admin"),
    icon: CheckCircle,
    color: "bg-[#5E3B85] text-white",
    hover: "hover:bg-[#4a2d6b]",
    active: "bg-[#4a2d6b]",
    visibleTo: ["parent"],
    mobileOrder: 5,
  },
];

const utilityNavItems = [
  {
    title: "Settings",
    url: createPageUrl("Account"),
    icon: Settings,
    color: "bg-gray-200 text-gray-700",
    hover: "hover:bg-gray-300",
    active: "bg-gray-300",
  },
  {
    title: "Upgrade",
    url: createPageUrl("Pricing"),
    icon: Zap,
    color: "bg-green-400 text-green-800",
    hover: "hover:bg-green-500",
    active: "bg-green-500",
  },
];

// ─── Tier display mapping ────────────────────────────────────────────────────

const TIER_LABELS = {
  free: "Free",
  premium: "Premium",
  family_plus: "Family Plus",
};

// ─── Reusable NavItem component (eliminates 3x duplication) ──────────────────

function SidebarNavItem({ item, isActive }) {
  return (
    <Link
      to={item.url}
      className={`funky-button flex items-center gap-4 p-4 ${item.color} ${item.hover} ${isActive ? item.active : ""}`}
    >
      <item.icon className="w-6 h-6" />
      <span className="text-xl header-font">{item.title}</span>
    </Link>
  );
}

function MobileNavItem({ item, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-transform duration-200 flex-shrink-0 select-none ${
        isActive ? "scale-105" : "scale-95 opacity-80"
      }`}
    >
      <div
        className={`funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${item.color}`}
      >
        <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <span className="text-[10px] body-font text-[#5E3B85] leading-tight">
        {item.title}
      </span>
    </button>
  );
}

// ─── Mobile "More" overflow menu ─────────────────────────────────────────────

function MobileMoreMenu({ items, location, navigate }) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex flex-col items-center gap-1 transition-transform duration-200 scale-95 opacity-80 select-none"
      >
        <div className="funky-button w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-gray-200 text-gray-700">
          <MoreHorizontal className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <span className="text-[10px] body-font text-[#5E3B85] leading-tight">
          More
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 z-50 bg-white border-3 border-[#5E3B85] rounded-2xl shadow-lg p-2 min-w-[160px]">
            {items.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    navigate(item.url);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gray-100 font-bold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color}`}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="body-font text-sm text-[#5E3B85]">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Footer component (extracted for readability) ────────────────────────────

function AppFooter() {
  return (
    <footer className="bg-white border-t-4 border-[#5E3B85] mt-16 lg:mt-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="mx-10 px-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="header-font text-2xl text-[#2B59C3]">
                ChoreBuddy App
              </h3>
            </div>
            <p className="body-font-light text-gray-600 text-sm">
              Making household chores fun and manageable for the whole family.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="body-font text-lg text-[#5E3B85]">Quick Links</h4>
            <div className="space-y-2 body-font-light text-sm">
              <Link
                to={createPageUrl("Account")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
                Account Settings
              </Link>
              <Link
                to={createPageUrl("Help")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
                Help & Support
              </Link>
              <Link
                to={createPageUrl("Pricing")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
                Pricing Plans
              </Link>
            </div>
          </div>

          {/* Legal & Privacy — each link now points to a distinct page */}
          <div className="space-y-4">
            <h4 className="body-font text-lg text-[#5E3B85]">
              Legal & Privacy
            </h4>
            <div className="space-y-2 body-font-light text-sm">
              <Link
                to={createPageUrl("Privacy")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to={createPageUrl("Terms")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to={createPageUrl("Cookies")}
                className="block text-gray-600 hover:text-[#2B59C3] transition-colors"
              >
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
              <a
                href="mailto:support@chorebuddyapp.com"
                className="hover:text-[#2B59C3] transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Hook: filters nav items by user role ────────────────────────────────────

function useFilteredNavItems(currentUser) {
  const isParent = checkParent(currentUser);
  const userRole = currentUser?.family_role || "child";

  return useMemo(() => {
    const roleFiltered = navigationItems.filter((item) =>
      item.visibleTo.includes(userRole)
    );

    const adminFiltered = isParent ? adminNavigationItems : [];

    // All items visible in sidebar
    const sidebarItems = [...roleFiltered, ...adminFiltered];

    // Mobile: split into primary bar (items with mobileOrder) and overflow
    const allMobileItems = [...roleFiltered, ...adminFiltered];
    const primaryMobile = allMobileItems
      .filter((item) => item.mobileOrder != null)
      .sort((a, b) => a.mobileOrder - b.mobileOrder);
    const overflowMobile = allMobileItems.filter(
      (item) => item.mobileOrder == null
    );

    return { sidebarItems, primaryMobile, overflowMobile };
  }, [userRole, isParent]);
}

// ─── Main AppLayout ──────────────────────────────────────────────────────────

function AppLayout({
  children,
  currentPageName,
  showOnboarding,
  setShowOnboarding,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const isPublicPage = PUBLIC_PAGES.includes(currentPageName);

  // ── Auth check ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPublicPage) {
      // Don't block public pages with auth — but still check silently
      // so authenticated users on public pages get the full layout
      const checkAuthSilently = async () => {
        try {
          const userData = await base44.auth.me();
          setIsAuthenticated(true); // Fix: was missing `true`
          setCurrentUser(userData);
        } catch {
          setIsAuthenticated(false);
          setCurrentUser(null);
        } finally {
          setAuthChecked(true);
        }
      };
      checkAuthSilently();
      return;
    }

    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setIsAuthenticated(true); // Fix: was called without argument
        setCurrentUser(userData);

        // Redirect to role selection if no role set
        if (!userData.family_role && currentPageName !== "RoleSelection") {
          navigate(createPageUrl("RoleSelection"));
          return;
        }

        // Show onboarding once per browser session (survives error boundary remounts)
        if (
          userData.family_role &&
          !userData.data?.onboarding_completed &&
          currentPageName !== "RoleSelection" &&
          !sessionStorage.getItem("chorebuddy_onboarding_shown")
        ) {
          setShowOnboarding(true);
          sessionStorage.setItem("chorebuddy_onboarding_shown", "true");
        }
      } catch {
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [currentPageName, navigate, isPublicPage, setShowOnboarding]);

  // ── Navigation filtering ──────────────────────────────────────────────────

  const { sidebarItems, primaryMobile, overflowMobile } =
    useFilteredNavItems(currentUser);

  // ── Mobile nav click handler ──────────────────────────────────────────────

  const handleMobileNavClick = useCallback(
    (item) => {
      const isActive = location.pathname === item.url;
      if (isActive) {
        navigate(item.url, { replace: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate(item.url);
      }
    },
    [location.pathname, navigate]
  );

  // ── Public pages: render immediately (no auth spinner) ────────────────────

  if (isPublicPage && !isAuthenticated) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  // ── Waiting for auth ──────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFBF5]">
        <Loader2 className="w-16 h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFBF5]">
        <Loader2 className="w-16 h-16 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  // ── Authenticated layout ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FDFBF5] text-[#5E3B85]">
      <div className="flex flex-col lg:flex-row p-4 lg:p-8 gap-8">
        {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            {/* Logo & User */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4">
                <div className="funky-button w-16 h-16 bg-[#C3B1E1] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="header-font text-4xl no-underline uppercase">
                    CHOREBUDDY APP
                  </h1>
                </div>
              </div>

              {currentUser?.data?.avatar && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-lg">
                  <UserAvatar avatarId={currentUser.data.avatar} size="md" />
                  <div>
                    <p className="body-font text-sm text-[#5E3B85]">
                      {currentUser.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {TIER_LABELS[currentUser.subscription_tier] || "Free"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar nav — single loop, role-filtered */}
            <div className="space-y-4">
              {sidebarItems.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  item={item}
                  isActive={location.pathname === item.url}
                />
              ))}

              {/* Utility links */}
              <div className="pt-4 border-t-2 border-dashed border-gray-300 space-y-4">
                {utilityNavItems.map((item) => (
                  <SidebarNavItem
                    key={item.title}
                    item={item}
                    isActive={location.pathname === item.url}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <MobileHeader currentPageName={currentPageName} />
          <div className="pt-mobile-header lg:pt-0">{children}</div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <AppFooter />

      {/* ── Mobile Navigation ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#FDFBF5]/80 backdrop-blur-sm border-t-3 border-[#5E3B85] overflow-hidden pb-safe z-30">
        <div className="flex items-center justify-start gap-2 p-2 sm:p-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {/* Primary mobile items (limited set) */}
          {primaryMobile.map((item) => (
            <MobileNavItem
              key={item.title}
              item={item}
              isActive={location.pathname === item.url}
              onClick={() => handleMobileNavClick(item)}
            />
          ))}

          {/* Utility items inline */}
          {utilityNavItems.map((item) => (
            <MobileNavItem
              key={item.title}
              item={item}
              isActive={location.pathname === item.url}
              onClick={() => navigate(item.url)}
            />
          ))}

          {/* Overflow "More" menu for remaining items */}
          <MobileMoreMenu
            items={overflowMobile}
            location={location}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Root wrapper ────────────────────────────────────────────────────────────

export default function LayoutWrapper(props) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <AppLayout
            {...props}
            showOnboarding={showOnboarding}
            setShowOnboarding={setShowOnboarding}
          />
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