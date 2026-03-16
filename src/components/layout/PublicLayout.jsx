import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { setCookie, getCookie } from '../utils/cookies';
import { useAuth } from '@/lib/AuthContext';

export default function PublicLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = getCookie('cookieConsent');
    if (!consent) {
      setShowCookieBanner(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    setCookie('cookieConsent', 'true', 365);
    setShowCookieBanner(false);
  };

  return (
    <div className="bg-[#FDFBF5] text-[#5E3B85]">
       <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;800&display=swap');
          
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
        `}</style>

      {/* Header */}
      <header className="sticky top-0 bg-[#FDFBF5]/80 backdrop-blur-sm z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to={createPageUrl("Home")} className="flex items-center gap-3">
            <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="header-font text-3xl text-[#2B59C3]">ChoreBuddy</h1>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button
                  className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white header-font text-lg px-6 py-2"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="ghost" className="body-font text-[#5E3B85] hidden sm:block" onClick={() => User.loginWithRedirect(createPageUrl("Dashboard"))}>
                  Log In
                </Button>
                <Button
                  className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white header-font text-lg px-6 py-2"
                  onClick={() => User.loginWithRedirect(createPageUrl("Dashboard"))}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main>{children}</main>

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#C3B1E1] text-white text-center body-font-light text-sm">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
            <p>
              We use cookies to ensure you get the best experience on our website. By continuing to use this site, you agree to our <Link to={createPageUrl("Privacy")} className="underline hover:text-[#2B59C3] transition-colors">Privacy Policy</Link>.
            </p>
            <Button
              onClick={handleAcceptCookies}
              className="funky-button bg-[#FF6B35] hover:bg-[#fa5a1f] text-white header-font px-6 py-2 flex-shrink-0"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}

      {/* Footer from main layout, adapted for public pages */}
      <footer className="bg-white border-t-4 border-[#5E3B85] mt-16 lg:mt-8">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="header-font text-2xl text-[#2B59C3]">ChoreBuddy</h3>
              </div>
              <p className="body-font-light text-gray-600 text-sm">
                Making household chores fun and manageable for the whole family.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="body-font text-lg text-[#5E3B85]">Quick Links</h4>
              <div className="space-y-2 body-font-light text-sm">
                <Link to={createPageUrl("Home")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Home
                </Link>
                <Link to={createPageUrl("Pricing")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Pricing Plans
                </Link>
                <Link to={createPageUrl("Help")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Help & Support
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="body-font text-lg text-[#5E3B85]">Legal & Privacy</h4>
              <div className="space-y-2 body-font-light text-sm">
                <Link to={createPageUrl("Privacy")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Privacy Policy
                </Link>
                <Link to={createPageUrl("Privacy")} className="block text-gray-600 hover:text-[#2B59C3] transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-dashed border-gray-300 mt-8 pt-6">
            <p className="body-font-light text-sm text-gray-600 text-center">
              © {new Date().getFullYear()} ChoreBuddy App. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}