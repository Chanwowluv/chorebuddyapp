/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Account from './pages/Account';
import Achievements from './pages/Achievements';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import ApprovalQueue from './pages/ApprovalQueue';
import Challenges from './pages/Challenges';
import ChoreHistory from './pages/ChoreHistory';
import ChoreTrades from './pages/ChoreTrades';
import Chores from './pages/Chores';
import Dashboard from './pages/Dashboard';
import FamilyCalendar from './pages/FamilyCalendar';
import FamilyLinking from './pages/FamilyLinking';
import Goals from './pages/Goals';
import Help from './pages/Help';
import Home from './pages/Home';
import Index from './pages/Index';
import JoinFamily from './pages/JoinFamily';
import LeaderboardHistory from './pages/LeaderboardHistory';
import Messages from './pages/Messages';
import NoticeBoard from './pages/NoticeBoard';
import PaymentCancel from './pages/PaymentCancel';
import PaymentSuccess from './pages/PaymentSuccess';
import People from './pages/People';
import PhotoGallery from './pages/PhotoGallery';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import RoleSelection from './pages/RoleSelection';
import Schedule from './pages/Schedule';
import Store from './pages/Store';
import Templates from './pages/Templates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "Achievements": Achievements,
    "Admin": Admin,
    "Analytics": Analytics,
    "ApprovalQueue": ApprovalQueue,
    "Challenges": Challenges,
    "ChoreHistory": ChoreHistory,
    "ChoreTrades": ChoreTrades,
    "Chores": Chores,
    "Dashboard": Dashboard,
    "FamilyCalendar": FamilyCalendar,
    "FamilyLinking": FamilyLinking,
    "Goals": Goals,
    "Help": Help,
    "Home": Home,
    "Index": Index,
    "JoinFamily": JoinFamily,
    "LeaderboardHistory": LeaderboardHistory,
    "Messages": Messages,
    "NoticeBoard": NoticeBoard,
    "PaymentCancel": PaymentCancel,
    "PaymentSuccess": PaymentSuccess,
    "People": People,
    "PhotoGallery": PhotoGallery,
    "Pricing": Pricing,
    "Privacy": Privacy,
    "RoleSelection": RoleSelection,
    "Schedule": Schedule,
    "Store": Store,
    "Templates": Templates,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};