import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import LiveEarningsBar from '../LiveEarningsBar';
import ChatSidebar from '../chat/ChatSidebar';

const DashboardLayout = ({ children, showLiveBar = true, fullWidth = false }) => {
  const [chatOpen, setChatOpen] = useState(() => {
    return localStorage.getItem('chatOpen') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('chatOpen', chatOpen);
    window.dispatchEvent(new Event('chatToggle'));
  }, [chatOpen]);

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FAFAFA';
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-[#FAFAFA] text-gray-900 overflow-x-hidden flex flex-col selection:bg-[#24324D] selection:text-white">
      {/* Ambient Background Glows */}
      {/* <div className="ambient-bg" aria-hidden="true" /> */}

      {/* Sticky Header — passes chat toggle down */}
      <Header onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />

      {/* Live Earnings Ticker */}
      {showLiveBar && <LiveEarningsBar />}

      {/* Main Content Wrapper */}
      <div
        className="transition-all duration-300 ease-in-out w-full flex-1 bg-[#FAFAFA]"
      >
        <main
          className={`w-full mx-auto flex flex-col ${
            fullWidth ? 'pb-4 lg:pb-0' : 'px-4 md:px-8 lg:px-0 pt-0 pb-6 lg:pb-4 max-w-[1328px]'
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
