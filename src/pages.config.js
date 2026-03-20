/**
 * pages.config.js - Page routing configuration
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Account from './pages/Account';
import Achievements from './pages/Achievements';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "Achievements": Achievements,
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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};