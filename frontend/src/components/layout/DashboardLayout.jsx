import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import LiveEarningsBar from '../LiveEarningsBar';
import ChatSidebar from '../chat/ChatSidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

const DashboardLayout = ({ children, showLiveBar = true, fullWidth = false }) => {
  const { isDarkMode } = useTheme();
  const cookieConsent = useCookieConsent();
  const hasConsent = cookieConsent?.hasConsent;

  const [chatOpen, setChatOpen] = useState(() => {
    try {
      const raw = localStorage.getItem('taskmint_cookie_consent');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.functional) {
        return localStorage.getItem('chatOpen') === 'true';
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    if (hasConsent && hasConsent('functional')) {
      localStorage.setItem('chatOpen', chatOpen);
      document.cookie = `chatOpen=${chatOpen}; max-age=31536000; path=/; SameSite=Lax`;
    } else {
      localStorage.removeItem('chatOpen');
      document.cookie = 'chatOpen=; max-age=0; path=/; SameSite=Lax';
    }
    window.dispatchEvent(new Event('chatToggle'));
  }, [chatOpen, hasConsent]);

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = isDarkMode ? 'rgba(12, 14, 17, 1)' : '#FAFAFA';
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, [isDarkMode]);

  return (
    <div
      className={`relative min-h-[100dvh] overflow-x-hidden flex flex-col selection:bg-[#24324D] selection:text-white transition-colors duration-300 ${
        isDarkMode ? 'bg-[rgba(12,14,17,1)] text-white' : 'bg-[#FAFAFA] text-gray-900'
      }`}
      style={{
        backgroundColor: isDarkMode ? 'rgba(12, 14, 17, 1)' : '#FAFAFA',
      }}
    >
      {/* Ambient Background Glows */}
      {/* <div className="ambient-bg" aria-hidden="true" /> */}

      {/* FIXED TOP HEADER + LIVE FEED BAR ON MOBILE (< 1024px) / NORMAL ON DESKTOP */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 lg:static lg:bg-transparent lg:z-auto transition-colors duration-300 ${
          isDarkMode ? 'bg-[rgba(12,14,17,1)]' : 'bg-[#FAFAFA]'
        }`}
      >
        <Header onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />
        {showLiveBar && <LiveEarningsBar />}
      </div>

      {/* Main Content Wrapper (offset for fixed mobile header) */}
      <div
        className={`transition-all duration-300 ease-in-out w-full flex-1 ${
          isDarkMode ? 'bg-[rgba(12,14,17,1)]' : 'bg-[#FAFAFA]'
        } ${
          showLiveBar
            ? 'pt-[calc(124px+env(safe-area-inset-top,0px))] lg:pt-0'
            : 'pt-[calc(72px+env(safe-area-inset-top,0px))] lg:pt-0'
        }`}
      >
        <main
          className={`w-full mx-auto flex flex-col ${fullWidth ? 'pb-4 lg:pb-0' : 'px-4 md:px-8 lg:px-0 pt-0 pb-6 lg:pb-4 max-w-[1328px]'
            }`}
        >
          {children}
        </main>
      </div>

      {/* NEW FOOTER */}
      <Footer />

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
